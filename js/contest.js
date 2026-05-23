// Modo Concurso: 20 questões, nota final, correção e revisão dos erros
let contestQuestions = [];
let contestAnswers = [];
let contestIndex = 0;
let contestTotal = 20;

function startContest() {
  const content = document.getElementById('content-input').value.trim();
  const key = document.getElementById('api-key-input').value.trim();

  if (!validateSetup(content, key)) return;

  apiKey = key;
  userContent = content;

  const firstLine = content.split('\n')[0].trim();
  contentTitle = firstLine.slice(0, 38) + (firstLine.length > 38 ? '…' : '');

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('contest-screen').classList.remove('hidden');
  document.getElementById('contest-title').textContent = contentTitle || 'MODO CONCURSO';

  contestQuestions = [];
  contestAnswers = [];
  contestIndex = 0;

  showContestLoading();
  fetchContestQuestions(contestTotal)
    .then(questions => {
      contestQuestions = questions;
      contestAnswers = new Array(questions.length).fill(null);
      renderContestQuestion();
    })
    .catch(err => showContestError(err.message));
}

function validateSetup(content, key) {
  let ok = true;

  if (content.length < 100) {
    document.getElementById('content-input').classList.add('error');
    setTimeout(() => document.getElementById('content-input').classList.remove('error'), 800);
    ok = false;
  }

  if (!key || !key.startsWith('gsk_')) {
    document.getElementById('api-key-input').classList.add('error');
    setTimeout(() => document.getElementById('api-key-input').classList.remove('error'), 800);
    ok = false;
  }

  return ok;
}

function showContestLoading() {
  document.getElementById('contest-body').innerHTML = `
    <div class="contest-loading">
      <div class="setup-icon">📝</div>
      <p class="question">Gerando prova com 20 questões...</p>
      <div class="skeleton opt"></div>
      <div class="skeleton opt"></div>
      <div class="skeleton opt"></div>
      <p class="setup-hint">A IA vai criar uma prova no estilo concurso com base no conteúdo colado.</p>
    </div>
  `;
  document.getElementById('contest-progress').style.width = '0%';
}

function showContestError(message) {
  document.getElementById('contest-body').innerHTML = `
    <p style="color:#ff4466;font-size:13px;line-height:1.6;margin-bottom:16px">
      ⚠️ ${escHtml(message)}
    </p>
    <button class="btn" onclick="startContest()">Tentar novamente</button>
    <button class="change-btn wide-change" onclick="goBackFromContest()">Voltar</button>
  `;
}

function renderContestQuestion() {
  const q = contestQuestions[contestIndex];
  const selected = contestAnswers[contestIndex];
  const progress = ((contestIndex + 1) / contestQuestions.length) * 100;

  document.getElementById('contest-progress').style.width = progress + '%';
  document.getElementById('contest-counter').textContent = `Questão ${contestIndex + 1}/${contestQuestions.length}`;

  const options = q.options.map((opt, i) => `
    <button class="option ${selected === i ? 'selected' : ''}" onclick="selectContestAnswer(${i})">
      <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
      ${escHtml(opt)}
    </button>
  `).join('');

  document.getElementById('contest-body').innerHTML = `
    <p class="question">${contestIndex + 1}. ${escHtml(q.question)}</p>
    <div class="options">${options}</div>
    <div class="contest-nav">
      <button class="change-btn" onclick="prevContestQuestion()" ${contestIndex === 0 ? 'disabled' : ''}>← Anterior</button>
      <button class="change-btn" onclick="nextContestQuestion()" ${contestIndex === contestQuestions.length - 1 ? 'disabled' : ''}>Próxima →</button>
    </div>
    <button class="btn" onclick="finishContest()">Finalizar prova</button>
    <p class="setup-hint answered-hint">Respondidas: ${contestAnswers.filter(a => a !== null).length}/${contestQuestions.length}</p>
  `;
}

function selectContestAnswer(idx) {
  contestAnswers[contestIndex] = idx;
  renderContestQuestion();
}

function nextContestQuestion() {
  if (contestIndex < contestQuestions.length - 1) {
    contestIndex++;
    renderContestQuestion();
  }
}

function prevContestQuestion() {
  if (contestIndex > 0) {
    contestIndex--;
    renderContestQuestion();
  }
}

function finishContest() {
  const blank = contestAnswers.filter(a => a === null).length;
  if (blank > 0 && !confirm(`Você deixou ${blank} questão(ões) em branco. Deseja finalizar mesmo assim?`)) return;

  const right = contestQuestions.reduce((acc, q, i) => acc + (contestAnswers[i] === q.answer ? 1 : 0), 0);
  const percent = Math.round((right / contestQuestions.length) * 100);
  const wrong = contestQuestions.length - right;
  const grade = (percent / 10).toFixed(1).replace('.', ',');

  document.getElementById('contest-progress').style.width = '100%';
  document.getElementById('contest-counter').textContent = 'Resultado final';

  document.getElementById('contest-body').innerHTML = `
    <div class="result-box">
      <div class="result-score">${percent}%</div>
      <div class="result-grade">Nota: ${grade}/10</div>
      <p class="setup-sub">Você acertou <strong>${right}</strong> de <strong>${contestQuestions.length}</strong> questões.</p>
    </div>

    <div class="result-grid">
      <div class="result-mini ok">✅ ${right}<br><span>acertos</span></div>
      <div class="result-mini bad">❌ ${wrong}<br><span>erros/brancas</span></div>
    </div>

    <button class="btn" onclick="reviewContestErrors()">Revisar erros</button>
    <button class="change-btn wide-change" onclick="restartContest()">Refazer nova prova</button>
    <button class="change-btn wide-change" onclick="goBackFromContest()">Trocar conteúdo</button>
  `;
}

function reviewContestErrors() {
  const wrongItems = contestQuestions
    .map((q, i) => ({ q, i, chosen: contestAnswers[i] }))
    .filter(item => item.chosen !== item.q.answer);

  if (wrongItems.length === 0) {
    document.getElementById('contest-body').innerHTML = `
      <div class="result-box">
        <div class="result-score">🏆</div>
        <p class="question">Parabéns! Você não errou nenhuma questão.</p>
      </div>
      <button class="btn" onclick="restartContest()">Gerar nova prova</button>
    `;
    return;
  }

  const html = wrongItems.map(item => {
    const q = item.q;
    const chosenText = item.chosen === null ? 'Em branco' : q.options[item.chosen];
    const rightText = q.options[q.answer];

    return `
      <div class="review-card">
        <p class="review-q"><strong>Questão ${item.i + 1}:</strong> ${escHtml(q.question)}</p>
        <p class="wrong-label">Sua resposta: ${escHtml(chosenText)}</p>
        <p class="correct-label">Correta: ${escHtml(rightText)}</p>
        <p class="review-exp">${escHtml(q.explanation || 'Revise esse conceito no material de estudo.')}</p>
      </div>
    `;
  }).join('');

  document.getElementById('contest-counter').textContent = `Revisão de erros (${wrongItems.length})`;
  document.getElementById('contest-body').innerHTML = `
    <div class="review-list">${html}</div>
    <button class="btn" onclick="restartContest()">Gerar nova prova</button>
    <button class="change-btn wide-change" onclick="goBackFromContest()">Trocar conteúdo</button>
  `;
}

function restartContest() {
  startContest();
}

function goBackFromContest() {
  document.getElementById('contest-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
}
