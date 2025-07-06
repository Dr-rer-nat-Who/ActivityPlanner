document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  const body = document.body;
  body.classList.toggle('dark');
  const btn = document.getElementById('dark-mode-toggle');
  btn.textContent = body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
});

function setupSwipe(card) {
  const acceptBtn = card.querySelector('.accept');
  const declineBtn = card.querySelector('.decline');
  acceptBtn.addEventListener('click', () => swipe(card, 'right'));
  declineBtn.addEventListener('click', () => swipe(card, 'left'));
}

function swipe(card, direction) {
  card.style.transform = direction === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
  setTimeout(() => {
    card.remove();
    const next = document.querySelector('.card');
    if (next) next.classList.add('active');
  }, 250);
}

document.querySelectorAll('.card').forEach(setupSwipe);
