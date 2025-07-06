const activities = [
  {
    title: 'Wandern im Park',
    date: '12. Mai 2024',
    description: 'Wir treffen uns zum **Wandern** im Stadtpark. Alle Infos unter [CityPark](https://example.com).',
    participants: [
      {name: 'Anna', avatar: 'img/user1.svg'},
      {name: 'Ben', avatar: 'img/user2.svg'}
    ],
    status: 'none'
  },
  {
    title: 'Filmabend',
    date: '20. Mai 2024',
    description: 'Gemeinsamer Filmabend. Mehr unter [IMDB](https://example.com/movie).',
    participants: [
      {name: 'Clara', avatar: 'img/user3.svg'},
      {name: 'David', avatar: 'img/user4.svg'}
    ],
    status: 'none'
  }
];

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((http.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

function openModal(index) {
  const act = activities[index];
  document.getElementById('detail-title').innerText = act.title;
  document.getElementById('detail-date').innerText = act.date;
  document.getElementById('detail-description').innerHTML = renderMarkdown(act.description);

  const list = document.getElementById('detail-participants');
  list.innerHTML = '';
  act.participants.forEach(p => {
    const li = document.createElement('li');
    li.className = 'participant';
    li.innerHTML = `<img src="${p.avatar}" alt="${p.name}"><span>${p.name}</span>`;
    list.appendChild(li);
  });

  document.getElementById('toggle-status').checked = act.status === 'going';
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.querySelectorAll('.activity-card').forEach(card => {
  card.addEventListener('click', () => {
    openModal(card.dataset.index);
  });
});

document.getElementById('close-btn').addEventListener('click', closeModal);

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

document.getElementById('toggle-status').addEventListener('change', (e) => {
  const title = document.getElementById('detail-title').innerText;
  const act = activities.find(a => a.title === title);
  act.status = e.target.checked ? 'going' : 'none';
});
