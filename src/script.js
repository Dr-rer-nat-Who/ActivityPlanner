const events = [
  {
    title: 'Grillen im Park',
    datetime: '2024-04-30T18:00',
    description: 'Treffen im Stadtpark beim Haupteingang.',
    rsvp: true,
  },
  {
    title: 'Filmabend',
    datetime: '2024-05-02T20:00',
    description: 'Bei Alex zuhause, Kellerkino.',
    rsvp: false,
  },
];

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE');
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function extractLocation(desc) {
  const match = desc.match(/im ([A-Za-zÄÖÜäöüß\s]+)/);
  return match ? match[1].trim() : '';
}

function populateTable() {
  const tbody = document.querySelector('#calendar-table tbody');
  events.forEach(event => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(event.datetime)}</td>
      <td>${formatTime(event.datetime)}</td>
      <td>${event.title}</td>
      <td>${extractLocation(event.description)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportICS() {
  const rsvpEvents = events.filter(e => e.rsvp);
  let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
  rsvpEvents.forEach(e => {
    const dt = new Date(e.datetime);
    const stamp = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    ics += 'BEGIN:VEVENT\n';
    ics += `UID:${stamp}@activityplanner\n`;
    ics += `DTSTAMP:${stamp}\n`;
    ics += `DTSTART:${stamp}\n`;
    ics += `SUMMARY:${e.title}\n`;
    ics += `DESCRIPTION:${e.description}\n`;
    ics += 'END:VEVENT\n';
  });
  ics += 'END:VCALENDAR';

  const blob = new Blob([ics], { type: 'text/calendar' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'events.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.addEventListener('DOMContentLoaded', () => {
  populateTable();
  document.getElementById('export-ics').addEventListener('click', exportICS);
});
