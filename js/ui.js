// Renderização e atualizações de interface
function renderQuestion(data) {
  const area = document.getElementById('question-area');
  const optHTML = data.options.map((opt, i) => `
    <button class="option" id="opt-${i}" onclick="selectAnswer(${i}, ${data.answer})">
      <span class="opt-letter">${String.fromCharCode(65+i)}</span>
      ${escHtml(opt)}
    </button>
  `).join('');

  area.innerHTML = `
    <p class="question">${escHtml(data.question)}</p>
    <div class="options">${optHTML}</div>
    <div class="explain hidden" id="explain" data-text="${escAttr(data.explanation)}"></div>
    <button class="btn hidden" id="next-btn" onclick="loadQuestion()">Próxima pergunta →</button>
  `;
}

function showQuestionSkeleton() {
  const area = document.getElementById('question-area');
  area.innerHTML = `
    <div class="skeleton wide" style="margin-bottom:8px"></div>
    <div class="skeleton mid" style="margin-bottom:20px"></div>
    <div class="skeleton opt"></div>
    <div class="skeleton opt"></div>
    <div class="skeleton opt"></div>
    <div class="skeleton opt"></div>
  `;
}

function showQuestionError(message) {
  const area = document.getElementById('question-area');
  area.innerHTML = `
    <p style="color:#ff4466;font-size:13px;line-height:1.6;margin-bottom:16px">
      ⚠️ ${escHtml(message)}
    </p>
    <button class="btn" onclick="loadQuestion()">Tentar novamente</button>
  `;
}

function updateScore() {
  const badge = document.getElementById('score-badge');
  badge.textContent = `⭐ ${score} pts`;
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 220);
}

function updateStreak() {
  const dots = document.getElementById('streak-dots').children;
  const hist = streakHistory.slice(-5);
  for (let i = 0; i < 5; i++) {
    dots[i].className = 'dot';
    if (hist[i] === 'hit') dots[i].classList.add('hit');
    else if (hist[i] === 'miss') dots[i].classList.add('miss');
  }
}

function updateStats() {
  const total = streakHistory.length;
  document.getElementById('stats-mini').textContent = `${totalRight}/${total} ✓`;
}

function updateProgress() {
  const pct = Math.min((totalRight / Math.max(qCount, 1)) * 100, 100);
  document.getElementById('progress-bar').style.width = pct + '%';
}
