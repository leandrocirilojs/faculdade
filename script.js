
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

 async function callGroqAPI(prompt, apiKey) {
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
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao comunicar com a Groq API');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

  async function generateQuiz(quantity) {
    const text = textarea.value.trim();
    const apiKey = document.getElementById('api-key').value.trim();

    if (!text) return alert('Por favor, insira o conteúdo para estudo.');
    if (!apiKey) return alert('Insira sua Groq API Key.');

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const systemPrompt = `Você é um gerador de testes educacionais. 
Com base no seguinte texto, gere exatamente ${quantity} questão(ões) no nível de dificuldade "${selectedDifficulty}".

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato exacto:
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

    try {
      const result = await callGroqAPI(systemPrompt, apiKey);
      currentQuestions = result.questions;
      currentIndex = 0;
      
      document.getElementById('loading').style.display = 'none';
      document.getElementById('quiz-screen').style.display = 'block';
      renderQuestion();
    } catch (err) {
      alert("Erro: " + err.message);
      document.getElementById('loading').style.display = 'none';
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
