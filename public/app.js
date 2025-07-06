// Toggle ready indicator
const indicator = document.getElementById('ready-indicator');
indicator.addEventListener('click', () => {
  indicator.classList.toggle('ready');
});

let activities = [];
let socket;

async function initCarousel() {
  const res = await fetch('/activities');
  activities = await res.json();
  if (!activities.length) return;

  let index = 0;
  const card = document.getElementById('activity-card');
  const title = card.querySelector('.title');
  const dateEl = card.querySelector('.date');
  const img = card.querySelector('.image');
  const partDiv = card.querySelector('.participants');
  const joinBtn = card.querySelector('.join');
  const declineBtn = card.querySelector('.decline');
  const modal = document.getElementById('detail-modal');
  const modalTitle = document.getElementById('detail-title');
  const modalDesc = document.getElementById('detail-description');
  const modalParts = document.getElementById('detail-participants');
  const toggleBtn = document.getElementById('detail-toggle');
  const backdrop = modal.querySelector('.backdrop');

  function renderParticipants(act) {
    partDiv.innerHTML = '';
    (act.participants || []).forEach((id) => {
      const imgEl = document.createElement('img');
      imgEl.className = 'participant-icon';
      imgEl.src = `/${id}/profile.jpg`;
      partDiv.appendChild(imgEl);
    });
  }

  function renderDetailParticipants(list) {
    modalParts.innerHTML = '';
    list.forEach((p) => {
      const d = document.createElement('div');
      d.className = 'detail-participant';
      const imgEl = document.createElement('img');
      imgEl.src = `/${p.id}/profile.jpg`;
      const span = document.createElement('span');
      span.textContent = p.username;
      d.appendChild(imgEl);
      d.appendChild(span);
      modalParts.appendChild(d);
    });
  }

  function show(i) {
    const act = activities[i];
    title.textContent = act.title;
    const d = new Date(act.date);
    dateEl.textContent = d.toLocaleDateString('de-DE');
    img.src = act.image;
    renderParticipants(act);
  }

  function next() {
    index = (index + 1) % activities.length;
    show(index);
  }

  joinBtn.addEventListener('click', async () => {
    const act = activities[index];
    await fetch(`/activities/${act.id}/join`, { method: 'POST' });
    if (!act.participants.includes(window.USER_ID)) {
      act.participants.push(window.USER_ID);
      renderParticipants(act);
    }
  });
  declineBtn.addEventListener('click', async () => {
    const act = activities[index];
    await fetch(`/activities/${act.id}/decline`, { method: 'POST' });
    activities.splice(index, 1);
    if (!activities.length) {
      card.remove();
      return;
    }
    if (index >= activities.length) index = 0;
    show(index);
  });

  img.addEventListener('click', async () => {
    const act = activities[index];
    const res = await fetch(`/activities/${act.id}/detail`);
    const data = await res.json();
    modalTitle.textContent = data.title;
    modalDesc.innerHTML = data.descriptionHtml;
    renderDetailParticipants(data.participants);
    modal.classList.add('active');
    toggleBtn.onclick = async () => {
      if ((act.participants || []).includes(window.USER_ID)) {
        await fetch(`/activities/${act.id}/decline`, { method: 'POST' });
        act.participants = act.participants.filter((id) => id !== window.USER_ID);
      } else {
        await fetch(`/activities/${act.id}/join`, { method: 'POST' });
        act.participants.push(window.USER_ID);
      }
      renderParticipants(act);
      modal.classList.remove('active');
    };
  });

  backdrop.addEventListener('click', () => modal.classList.remove('active'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.remove('active');
  });

  show(index);

  if ('Notification' in window) {
    Notification.requestPermission();
  }

  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  socket.addEventListener('message', (ev) => {
    const data = JSON.parse(ev.data);
    if (data.type === 'join') {
      const act = activities.find((a) => a.id === data.activityId);
      if (act && !act.participants.includes(data.userId)) {
        act.participants.push(data.userId);
        if (act === activities[index]) renderParticipants(act);
        if (data.userId !== window.USER_ID && act.creator === window.USER_ID && Notification.permission === 'granted') {
          new Notification(`${data.username} ist dabei`);
        }
      }
    } else if (data.type === 'decline') {
      const act = activities.find((a) => a.id === data.activityId);
      if (act) {
        const idx = act.participants.indexOf(data.userId);
        if (idx !== -1) {
          act.participants.splice(idx, 1);
          if (act === activities[index]) renderParticipants(act);
        }
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', initCarousel);
