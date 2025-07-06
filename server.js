const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));

// Load events from JSON file
function loadEvents() {
  const dataPath = path.join(__dirname, 'data', 'events.json');
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const raw = fs.readFileSync(dataPath);
  const events = JSON.parse(raw);
  return events;
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/past-activities', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 20;
  const events = loadEvents()
    .filter(e => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const start = (page - 1) * pageSize;
  const paginated = events.slice(start, start + pageSize);
  const hasNext = start + pageSize < events.length;
  res.render('past-activities', {
    events: paginated,
    page,
    hasNext
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
