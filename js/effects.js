// Efeitos visuais
function flyPoints(text, positive) {
  const el = document.createElement('div');
  el.className = 'fly' + (positive ? '' : ' neg');
  el.textContent = text;
  const rect = document.getElementById('quiz-screen').getBoundingClientRect();
  el.style.left = (rect.left + rect.width / 2 - 24) + 'px';
  el.style.top  = (rect.top + 70) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
