let selectedDifficulty = 'Fácil';
  let currentQuestions = [];
  let currentIndex = 0;

  const textarea = document.getElementById('study-content');
  const charCount = document.getElementById('char-count');

  // Atualizar contador de caracteres e extrair tópicos dinamicamente
  textarea.addEventListener('input', () => {
    const text = textarea.value;
    charCount.innerText = `${text.length} caracteres`;
    
    // Tópicos simples extraídos de palavras maiores que 5 letras
    if (text.length > 20) {
      const words = text.split(/\s+/).filter(w => w.length > 5);
      const unique = [...new Set(words)].slice(0, 5);
      const tagsContainer = document.getElementById('tags-container');
      tagsContainer.innerHTML = unique.map(w => `<span class="tag">${w.replace(/[^a-zA-ZáàâãéèêíóôõúçÁÀÂÃÉÈÍÓÔÕÚÇ]/g, '')}</span>`).join('');
    }
  });

  function setDifficulty(level, btn) {
    selectedDifficulty = level;
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

 async function callGroqAPI(prompt, apiKey, maxTokens = 2000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b', // <-- MODELO ESTÁVEL E ATIVO
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });

    if (response.status === 429) {
      // Rate limit: espera o tempo indicado pela Groq (ou um fallback) e tenta de novo
      const retryAfter = parseFloat(response.headers.get('retry-after')) || 3;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Falha de validação de JSON geralmente significa que a resposta foi
      // cortada (estourou max_tokens) antes de fechar o objeto JSON.
      // Tenta de novo pedindo um lote menor não é possível aqui, então só
      // repetimos a chamada (às vezes o modelo acerta na segunda tentativa).
      if (errorData.error?.code === 'json_validate_failed' && attempt < retries) {
        continue;
      }
      throw new Error(errorData.error?.message || 'Erro ao comunicar com a Groq API');
    }

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (e) {
      if (attempt < retries) continue;
      throw new Error('A IA retornou um JSON inválido. Tente novamente ou reduza a quantidade de questões.');
    }
  }
}

  const BATCH_SIZE = 5; // questões por requisição — mantém a resposta JSON curta o bastante para não ser cortada

  function buildPrompt(batchQty, text) {
    return `Você é um gerador de testes educacionais. 
Com base no seguinte texto, gere exatamente ${batchQty} questão(ões) no nível de dificuldade "${selectedDifficulty}".

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato exacto, sem nenhum texto antes ou depois:
{
  "questions": [
    {
      "question": "Pergunta aqui",
      "options": ["A) Opção 1", "B) Opção 2", "C) Opção 3", "D) Opção 4"],
      "correct_index": 0,
      "explanation": "Explicação detalhada da resposta correta."
    }
  ]
}

Texto base:
${text}`;
  }

  async function generateQuiz(quantity) {
    const text = textarea.value.trim();
    const apiKey = document.getElementById('api-key').value.trim();

    if (!text) return alert('Por favor, insira o conteúdo para estudo.');
    if (!apiKey) return alert('Insira sua Groq API Key.');

    document.getElementById('setup-screen').style.display = 'none';
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'block';

    // Trunca conteúdo muito longo para não estourar tokens de entrada
    const trimmedText = text.length > 4000 ? text.slice(0, 4000) : text;

    // Divide a quantidade pedida em lotes pequenos
    const batches = [];
    let remaining = quantity;
    while (remaining > 0) {
      const size = Math.min(BATCH_SIZE, remaining);
      batches.push(size);
      remaining -= size;
    }

    try {
      const allQuestions = [];
      for (let i = 0; i < batches.length; i++) {
        loadingEl.innerText = quantity > BATCH_SIZE
          ? `Gerando perguntas... (lote ${i + 1}/${batches.length})`
          : 'Gerando pergunta com a IA da Groq...';

        const prompt = buildPrompt(batches[i], trimmedText);
        // max_tokens proporcional ao tamanho do lote, com folga
        const result = await callGroqAPI(prompt, apiKey, 400 * batches[i] + 300);
        if (result?.questions?.length) {
          allQuestions.push(...result.questions);
        }

        // pequena pausa entre lotes para não bater no limite de tokens/minuto
        if (i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!allQuestions.length) {
        throw new Error('A IA não retornou nenhuma questão. Tente novamente.');
      }

      currentQuestions = allQuestions;
      currentIndex = 0;

      loadingEl.style.display = 'none';
      loadingEl.innerText = 'Gerando pergunta com a IA da Groq...';
      document.getElementById('quiz-screen').style.display = 'block';
      renderQuestion();
    } catch (err) {
      alert("Erro: " + err.message);
      loadingEl.style.display = 'none';
      loadingEl.innerText = 'Gerando pergunta com a IA da Groq...';
      document.getElementById('setup-screen').style.display = 'block';
    }
  }

  function renderQuestion() {
    const container = document.getElementById('quiz-container');
    const q = currentQuestions[currentIndex];
    
    document.getElementById('next-btn').style.display = 'none';

    container.innerHTML = `
      <div class="question-box">
        <div class="question-title"><strong>Questão ${currentIndex + 1}/${currentQuestions.length}:</strong> ${q.question}</div>
        <div class="options">
          ${q.options.map((opt, idx) => `
            <button class="option-btn" onclick="checkAnswer(${idx})">${opt}</button>
          `).join('')}
        </div>
        <div id="feedback" class="feedback"></div>
      </div>
    `;
  }

  function checkAnswer(selectedIndex) {
    const q = currentQuestions[currentIndex];
    const buttons = document.querySelectorAll('.option-btn');
    const feedback = document.getElementById('feedback');

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correct_index) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('wrong');
      }
    });

    if (selectedIndex === q.correct_index) {
      feedback.innerHTML = `<span style="color: #25a260;">✨ Correto!</span> <br>${q.explanation}`;
    } else {
      feedback.innerHTML = `<span style="color: #a2252e;">❌ Incorreto.</span> <br>${q.explanation}`;
    }

    if (currentIndex < currentQuestions.length - 1) {
      document.getElementById('next-btn').style.display = 'block';
    }
  }

  function nextQuestion() {
    currentIndex++;
    renderQuestion();
  }

  function resetApp() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
  }
