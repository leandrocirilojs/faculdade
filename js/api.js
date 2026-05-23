// Comunicação com a IA da Groq
async function fetchQuestion() {
  const avoid = usedQuestions.slice(-12).join(' | ');

  // Trunca o conteúdo para evitar excesso de tokens
  const contentSnippet = userContent.length > 3000
    ? userContent.slice(0, 3000) + '\n[...conteúdo truncado]'
    : userContent;

  const diffInstructions = {
    facil:   'Perguntas simples e diretas sobre definições, conceitos básicos e identificação de termos presentes no conteúdo.',
    medio:   'Perguntas intermediárias sobre funcionamento, comparações, exemplos de uso e relações entre os conceitos do conteúdo.',
    dificil: 'Perguntas avançadas e técnicas: aplicações práticas, exceções, detalhes específicos, análise crítica e situações-problema baseadas no conteúdo.'
  };

  const prompt = `Você é um gerador especializado de perguntas de quiz para estudantes.

O estudante forneceu o seguinte conteúdo de estudo:
---
${contentSnippet}
---

NÍVEL DE DIFICULDADE: ${difficulty.toUpperCase()}
INSTRUÇÃO: ${diffInstructions[difficulty]}

REGRAS OBRIGATÓRIAS:
- Gere UMA pergunta de múltipla escolha com exatamente 4 alternativas.
- A pergunta DEVE ser baseada exclusivamente no conteúdo fornecido acima.
- Apenas UMA alternativa deve estar correta.
- As alternativas incorretas devem ser plausíveis, não óbvias.
- A explicação deve referenciar o conteúdo e ser didática.
- Escreva tudo em português brasileiro.
- NÃO repita estas perguntas já usadas: [${avoid || 'nenhuma ainda'}]

Responda SOMENTE com JSON válido, sem markdown, sem texto extra:
{
  "question": "texto da pergunta",
  "options": ["opção A", "opção B", "opção C", "opção D"],
  "answer": 0,
  "explanation": "explicação curta, didática e baseada no conteúdo"
}

O campo "answer" é o índice 0-3 da opção correta.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.85,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro HTTP ${res.status}. Verifique sua chave API.`);
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content?.trim() || '';
  const clean = raw.replace(/```json|```/g, '').trim();

  let data;
  try { data = JSON.parse(clean); }
  catch { throw new Error('A IA retornou formato inválido. Tentando novamente...'); }

  if (!data.question || !Array.isArray(data.options) || data.options.length !== 4 || data.answer == null) {
    throw new Error('Dados incompletos da IA. Tente novamente.');
  }

  usedQuestions.push(data.question.slice(0, 70));
  return data;
}
