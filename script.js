const activities = [
    {
        title: 'Wandern im Wald',
        date: '2024-05-20',
        image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjI1Ij48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2NjY2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjI0Ij5CaWxkPC90ZXh0Pjwvc3ZnPg==',
        participants: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM4ODgiLz48L3N2Zz4=', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM4ODgiLz48L3N2Zz4=']
    },
    {
        title: 'Grillabend',
        date: '2024-05-25',
        image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjI1Ij48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2NjY2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjI0Ij5CaWxkPC90ZXh0Pjwvc3ZnPg==',
        participants: ['data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM4ODgiLz48L3N2Zz4=']
    },
    {
        title: 'Kino',
        date: '2024-06-01',
        image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjI1Ij48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2NjY2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjI0Ij5CaWxkPC90ZXh0Pjwvc3ZnPg==',
        participants: []
    }
];

// sort activities by date ascending
activities.sort((a, b) => new Date(a.date) - new Date(b.date));

let index = 0;

function createCard(activity) {
    const card = document.createElement('div');
    card.className = 'carousel-card';

    const img = document.createElement('img');
    img.src = activity.image;

    const info = document.createElement('div');
    info.className = 'card-info';

    const title = document.createElement('h3');
    title.textContent = activity.title;

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = new Date(activity.date).toLocaleDateString();

    const participants = document.createElement('div');
    participants.className = 'participants';
    activity.participants.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        participants.appendChild(img);
    });

    info.appendChild(title);
    info.appendChild(date);
    info.appendChild(participants);

    card.appendChild(img);
    card.appendChild(info);

    return card;
}

function showCard(i) {
    const carousel = document.getElementById('carousel');
    carousel.innerHTML = '';
    const card = createCard(activities[i]);
    carousel.appendChild(card);
}

function nextCard() {
    index = (index + 1) % activities.length;
    showCard(index);
}

document.getElementById('join').addEventListener('click', () => {
    alert('Teilnahme zugesagt: ' + activities[index].title);
    nextCard();
});

document.getElementById('decline').addEventListener('click', () => {
    alert('Teilnahme abgesagt: ' + activities[index].title);
    nextCard();
});

// Swipe detection
let startX = 0;
const carousel = document.getElementById('carousel');
carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
});
carousel.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    if (endX - startX < -50) {
        nextCard();
    } else if (endX - startX > 50) {
        index = (index - 1 + activities.length) % activities.length;
        showCard(index);
    }
});

// initial card
showCard(index);
