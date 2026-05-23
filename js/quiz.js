// Controle das perguntas e respostas
async function loadQuestion() {
  answered = false;
  qCount++;
  document.getElementById('q-counter').textContent = `Pergunta #${qCount}`;

  showQuestionSkeleton();

  try {
    const data = await fetchQuestion();
    renderQuestion(data);
  } catch(e) {
    showQuestionError(e.message);
  }
}

function selectAnswer(idx, correct) {
  if (answered) return;
  answered = true;

  const isCorrect = idx === correct;
  streakHistory.push(isCorrect ? 'hit' : 'miss');

  document.querySelectorAll('.option').forEach(b => b.disabled = true);
  document.getElementById(`opt-${correct}`).classList.add('correct');
  if (!isCorrect) {
    document.getElementById(`opt-${idx}`).classList.add('wrong');
    streak = 0;
  } else {
    streak = Math.min(streak + 1, 5);
    totalRight++;
  }

  let pts = 0;
  if (isCorrect) {
    const base = { facil: 5, medio: 10, dificil: 20 }[difficulty];
    const bonus = streak >= 3 ? Math.floor(base * 0.5) : 0;
    pts = base + bonus;
    score += pts;
  }

  flyPoints(isCorrect ? `+${pts}${streak >= 3 ? ' 🔥' : ''}` : '✗', isCorrect);
  updateScore();
  updateStreak();
  updateStats();
  updateProgress();

  const explainEl = document.getElementById('explain');
  explainEl.innerHTML = `<span class="${isCorrect ? 'correct-label' : 'wrong-label'}">${isCorrect ? '✓ Correto!' : '✗ Errado!'}</span> ${escHtml(explainEl.dataset.text || '')}`;
  explainEl.classList.remove('hidden');
  document.getElementById('next-btn').classList.remove('hidden');
}
