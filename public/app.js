// Toggle ready indicator
const indicator = document.getElementById('ready-indicator');
indicator.addEventListener('click', () => {
  indicator.classList.toggle('ready');
});

async function initCarousel() {
  const res = await fetch('/activities');
  const activities = await res.json();
  if (!activities.length) return;

  let index = 0;
  const card = document.getElementById('activity-card');
  const title = card.querySelector('.title');
  const dateEl = card.querySelector('.date');
  const img = card.querySelector('.image');
  const partDiv = card.querySelector('.participants');
  const joinBtn = card.querySelector('.join');
  const declineBtn = card.querySelector('.decline');

  function show(i) {
    const act = activities[i];
    title.textContent = act.title;
    const d = new Date(act.date);
    dateEl.textContent = d.toLocaleDateString('de-DE');
    img.src = act.image;
    partDiv.innerHTML = '';
    for (let p = 0; p < act.participants; p++) {
      const span = document.createElement('span');
      span.className = 'participant-icon';
      partDiv.appendChild(span);
    }
  }

  function next() {
    index = (index + 1) % activities.length;
    show(index);
  }

  joinBtn.addEventListener('click', next);
  declineBtn.addEventListener('click', next);

  show(index);
}

window.addEventListener('DOMContentLoaded', initCarousel);
