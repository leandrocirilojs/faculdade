// Comunicação com a IA da Groq

// Espera ms milissegundos
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Faz a chamada à API da Groq com retry automático em caso de rate limit (429)
async function groqRequest(body, { maxRetries = 3 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (res.status === 429 && attempt < maxRetries) {
      // Limite de tokens/minuto (TPM) estourado: espera e tenta de novo
      const retryAfterHeader = res.headers.get('retry-after');
      let waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
      if (!Number.isFinite(waitMs)) {
        const errBody = await res.json().catch(() => ({}));
        const match = /try again in ([\d.]+)s/i.exec(errBody.error?.message || '');
        waitMs = match ? parseFloat(match[1]) * 1000 : 2000 * (attempt + 1);
      }
      await sleep(waitMs + 250); // pequena margem de segurança
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro HTTP ${res.status}. Verifique sua chave API.`);
    }

    return res.json();
  }

  throw new Error('Limite de requisições da Groq atingido. Aguarde um instante e tente novamente.');
}

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

  const json = await groqRequest({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.85,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

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


// Gera um lote de questões (usado internamente por fetchContestQuestions)
async function fetchContestBatch(count) {
  const contentSnippet = userContent.length > 3000
    ? userContent.slice(0, 3000) + '\n[...conteúdo truncado]'
    : userContent;

  const diffInstructions = {
    facil:   'Questões diretas, cobrando conceitos e definições essenciais.',
    medio:   'Questões com comparação, interpretação e exemplos práticos.',
    dificil: 'Questões estilo concurso, com análise técnica, pegadinhas moderadas e situações-problema.'
  };

  const prompt = `Você é uma banca examinadora de concurso público na área de Redes de Computadores e Tecnologia.

Crie uma prova com ${count} questões de múltipla escolha baseada EXCLUSIVAMENTE no conteúdo abaixo:
---
${contentSnippet}
---

NÍVEL: ${difficulty.toUpperCase()}
INSTRUÇÃO: ${diffInstructions[difficulty]}

REGRAS OBRIGATÓRIAS:
- Gere exatamente ${count} questões.
- Cada questão deve ter exatamente 4 alternativas.
- Apenas uma alternativa deve estar correta.
- As alternativas devem ser plausíveis e com linguagem de concurso.
- Evite perguntas repetidas.
- Use português brasileiro.
- A explicação deve ser curta e didática.

Responda SOMENTE com JSON válido, sem markdown e sem texto extra:
{
  "questions": [
    {
      "question": "texto da questão",
      "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D"],
      "answer": 0,
      "explanation": "explicação da resposta correta"
    }
  ]
}`;

  const json = await groqRequest({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 3200,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = json.choices?.[0]?.message?.content?.trim() || '';
  const clean = raw.replace(/```json|```/g, '').trim();

  let data;
  try { data = JSON.parse(clean); }
  catch { throw new Error('A IA retornou a prova em formato inválido. Tente novamente.'); }

  const questions = data.questions;
  if (!Array.isArray(questions)) return [];

  return questions
    .filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer !== undefined)
    .map(q => ({
      question: String(q.question),
      options: q.options.map(String),
      answer: Number(q.answer),
      explanation: String(q.explanation || 'Revise esse conceito no material.')
    }));
}

// Gera a prova completa em lotes menores, para não estourar o limite de
// tokens/minuto (TPM) da Groq numa única requisição gigante.
async function fetchContestQuestions(total = 20, batchSize = 10) {
  const all = [];
  const batches = Math.ceil(total / batchSize);

  for (let i = 0; i < batches; i++) {
    const remaining = total - all.length;
    const count = Math.min(batchSize, remaining);

    const batch = await fetchContestBatch(count);
    all.push(...batch);

    // pequena pausa entre lotes para respeitar o limite por minuto
    if (i < batches - 1) await sleep(600);
  }

  const valid = all.slice(0, total);

  if (valid.length < Math.min(10, total)) {
    throw new Error('A prova veio com poucas questões válidas. Tente novamente.');
  }

  return valid;
}
