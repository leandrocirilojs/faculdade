// Estado global do quiz
let apiKey = '';
let difficulty = 'facil';
let userContent = '';
let contentTitle = '';
let score = 0;
let qCount = 0;
let streak = 0;
let totalRight = 0;
let answered = false;
let usedQuestions = [];
let streakHistory = [];
let previewTimer = null;

// Configuração inicial e navegação
function setDiff(d) {
  difficulty = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('diff-' + d).classList.add('active');
}

function onContentChange() {
  const val = document.getElementById('content-input').value;
  const len = val.length;
  const cc = document.getElementById('char-count');
  cc.textContent = `${len.toLocaleString('pt-BR')} caracteres`;
  cc.className = 'char-count' + (len >= 200 ? ' ok' : len > 50 ? ' warn' : '');

  clearTimeout(previewTimer);
  if (len > 80) {
    previewTimer = setTimeout(() => generatePreview(val), 600);
  } else {
    document.getElementById('preview-wrap').classList.add('hidden');
  }
}

function generatePreview(text) {
  const sample = text.slice(0, 500);
  const words = sample.match(/[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]{3,}/g) || [];
  const unique = [...new Set(words)].slice(0, 8);

  if (unique.length < 2) {
    document.getElementById('preview-wrap').classList.add('hidden');
    return;
  }

  const pills = unique.map(w => `<span class="pill">${escHtml(w)}</span>`).join('');
  document.getElementById('preview-pills').innerHTML = pills;
  document.getElementById('preview-wrap').classList.remove('hidden');
}

function startQuiz() {
  const content = document.getElementById('content-input').value.trim();
  const key = document.getElementById('api-key-input').value.trim();

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

  if (!ok) return;

  apiKey = key;
  userContent = content;

  const firstLine = content.split('\n')[0].trim();
  contentTitle = firstLine.slice(0, 38) + (firstLine.length > 38 ? '…' : '');

  document.getElementById('quiz-title').textContent = contentTitle || 'QUIZ ∞';

  const badge = document.getElementById('diff-show');
  badge.className = 'diff-badge ' + difficulty;
  badge.textContent = { facil: 'FÁCIL', medio: 'MÉDIO', dificil: 'DIFÍCIL' }[difficulty];

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');

  resetState();
  loadQuestion();
}

function goBack() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
}

function resetState() {
  score = 0; qCount = 0; streak = 0;
  totalRight = 0; usedQuestions = []; streakHistory = [];
  updateScore(); updateStreak(); updateStats();
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('q-counter').textContent = 'Pergunta #1';
}
