const activities = [
    { id: 1, title: 'Wandern', date: '2024-05-01', image: 'https://via.placeholder.com/150', status: 'none' },
    { id: 2, title: 'Kinoabend', date: '2024-05-03', image: 'https://via.placeholder.com/150', status: 'none' },
    { id: 3, title: 'Grillen', date: '2024-05-05', image: 'https://via.placeholder.com/150', status: 'none' }
];

function renderCarousel() {
    const carousel = document.getElementById('carousel');
    carousel.innerHTML = '';
    activities.filter(a => a.status !== 'rejected').forEach(activity => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${activity.title}</h3>
            <small>${activity.date}</small>
            <img src="${activity.image}" alt="${activity.title}">
            <div>
                <button class="join">Ich bin dabei</button>
                <button class="decline">Ich bin raus</button>
            </div>
        `;
        card.querySelector('.decline').addEventListener('click', () => {
            activity.status = 'rejected';
            renderCarousel();
            renderRejected();
        });
        card.querySelector('.join').addEventListener('click', () => {
            activity.status = 'accepted';
            renderCarousel();
        });
        carousel.appendChild(card);
    });
}

function renderRejected() {
    const list = document.getElementById('rejectedList');
    list.innerHTML = '';
    activities.filter(a => a.status === 'rejected').forEach(activity => {
        const mini = document.createElement('div');
        mini.className = 'mini-card';
        mini.innerHTML = `
            <img src="${activity.image}" alt="${activity.title}">
            <span>${activity.title}</span>
        `;
        mini.addEventListener('click', () => {
            activity.status = 'none';
            renderCarousel();
            renderRejected();
        });
        list.appendChild(mini);
    });
}

// Dropdown logic
const dropdownButton = document.getElementById('dropdownButton');
const dropdownList = document.getElementById('dropdownList');
const rejectedMenu = document.getElementById('rejectedMenu');
const rejectedSection = document.getElementById('rejectedSection');

dropdownButton.addEventListener('click', () => {
    dropdownList.classList.toggle('hidden');
});

rejectedMenu.addEventListener('click', () => {
    rejectedSection.classList.toggle('hidden');
    dropdownList.classList.add('hidden');
});

// Initial render
renderCarousel();
renderRejected();
