const express = require('express');
const session = require('express-session');
const csurf = require('csurf');
const argon2 = require('argon2');
const validator = require('validator');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');
const sanitizeHtml = require('sanitize-html');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const ASSET_DIR = path.join(__dirname, 'user-assets');
const ACTIVITIES_FILE = path.join(__dirname, 'data', 'activities.json');

fs.mkdir(ASSET_DIR, { recursive: true }).catch(() => {});

// Helpers to load and save users from the JSON file
async function loadUsers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));
}

async function loadActivities() {
  try {
    const data = await fs.readFile(ACTIVITIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveActivities(activities) {
  await fs.writeFile(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
}

function renderMarkdown(md) {
  let html = md.replace(/\r/g, '');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, (_, text, url) => {
    return `<a href="${validator.escape(url)}" target="_blank" rel="noopener">${validator.escape(text)}</a>`;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, (_, txt) => `<strong>${validator.escape(txt)}</strong>`);
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['strong']),
    allowedAttributes: { a: ['href', 'target', 'rel'] }
  });
}

app.use(express.urlencoded({ extended: false }));
app.use(express.static(ASSET_DIR));
app.use("/static", express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1MB
});

app.set('trust proxy', 1);
app.use(
  session({
    secret: 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'test',
    },
  })
);

app.get("/", async (req, res) => {
  let html = await fs.readFile(path.join(__dirname, "public", "index.html"), "utf8");
  const src = req.session.userId ? `/${req.session.userId}/profile.jpg` : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==";
  let userName = "";
  if (req.session.userId) {
    const users = await loadUsers();
    const u = users.find((u) => u.id === req.session.userId);
    if (u) userName = u.username;
  }
  html = html
    .replace("{{PROFILE_SRC}}", src)
    .replace("{{USER_ID}}", req.session.userId || '')
    .replace("{{USERNAME}}", userName);
  res.type("html").send(html);
});



app.get('/register', csurf(), (req, res) => {
  const form = `
    <form action="/register" method="POST" enctype="multipart/form-data">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      <div><label>Nutzername: <input name="username" required></label></div>
      <div><label>Passwort: <input type="password" name="password" required></label></div>
      <div><label>Profilbild: <input type="file" name="avatar" accept="image/jpeg,image/png" required></label></div>
      <button type="submit">Registrieren</button>
    </form>
  `;
  res.send(form);
});

app.post('/register', upload.single('avatar'), csurf(), async (req, res) => {
  const username = validator.trim(req.body.username || '');
  const password = req.body.password || '';

  if (username.length < 3 || username.length > 20) {
    return res
      .status(400)
      .send('Nutzername muss zwischen 3 und 20 Zeichen lang sein.');
  }
  if (password.length < 10) {
    return res
      .status(400)
      .send('Passwort muss mindestens 10 Zeichen lang sein.');
  }

  const sanitizedUsername = validator.escape(username);
  const users = await loadUsers();

  if (users.find((u) => u.username.toLowerCase() === sanitizedUsername.toLowerCase())) {
    return res.status(400).send('Nutzername bereits vergeben.');
  }

  if (!req.file) {
    return res.status(400).send('Profilbild erforderlich.');
  }
  if (!['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
    return res.status(400).send('Nur JPEG oder PNG erlaubt.');
  }

  const id = crypto.randomUUID();

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  users.push({ id, username: sanitizedUsername, password: hash });
  await saveUsers(users);

  const userDir = path.join(ASSET_DIR, id);
  await fs.mkdir(userDir, { recursive: true });
  await sharp(req.file.buffer)
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(path.join(userDir, 'profile.jpg'));

  const img = `<img src="/${id}/profile.jpg" style="border-radius:50%;width:128px;height:128px;" />`;
  res.send(`Registrierung erfolgreich.<br>${img}`);
});

const loginAttempts = {};

app.get('/login', csurf(), (req, res) => {
  const form = `
    <form action="/login" method="POST">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      <div><label>Nutzername: <input name="username" required></label></div>
      <div><label>Passwort: <input type="password" name="password" required></label></div>
      <button type="submit">Login</button>
    </form>
  `;
  res.send(form);
});

app.post('/login', csurf(), async (req, res) => {
  const username = validator.escape(validator.trim(req.body.username || '')).toLowerCase();
  const password = req.body.password || '';

  const attempt = loginAttempts[username] || { count: 0, blockedUntil: 0 };
  const now = Date.now();
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    return res.status(429).send('Zu viele Fehlversuche. Bitte später erneut versuchen.');
  }

  const users = await loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username);

  if (!user || !(await argon2.verify(user.password, password))) {
    attempt.count += 1;
    if (attempt.count >= 3) {
      attempt.blockedUntil = now + 5 * 60 * 1000;
      attempt.count = 0;
    }
    loginAttempts[username] = attempt;
    return res.status(401).send('Ungültige Anmeldedaten.');
  }

  loginAttempts[username] = { count: 0, blockedUntil: 0 };
  req.session.userId = user.id;
  res.send('Login erfolgreich');
});

app.get('/activities', async (req, res) => {
  const activities = await loadActivities();
  activities.sort((a, b) => new Date(a.date) - new Date(b.date));
  let result = activities;
  if (req.session.userId) {
    result = activities.filter(
      (a) => !(a.declined || []).includes(req.session.userId)
    );
  }
  res.json(result);
});

app.get('/activities/:id/detail', async (req, res) => {
  const activities = await loadActivities();
  const act = activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).send('Not found');
  const users = await loadUsers();
  const participants = (act.participants || []).map((id) => {
    const u = users.find((user) => user.id === id);
    return { id, username: u ? u.username : '' };
  });
  const html = renderMarkdown(act.description || '');
  res.json({
    id: act.id,
    title: act.title,
    date: act.date,
    image: act.image,
    descriptionHtml: html,
    participants,
  });
});

app.post('/activities/:id/join', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  const act = activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).send('Not found');
  act.participants = act.participants || [];
  if (!act.participants.includes(req.session.userId)) {
    act.participants.push(req.session.userId);
    await saveActivities(activities);
    const users = await loadUsers();
    const user = users.find((u) => u.id === req.session.userId);
    broadcast({
      type: 'join',
      activityId: act.id,
      userId: req.session.userId,
      username: user ? user.username : ''
    });
  }
  res.sendStatus(200);
});

app.post('/activities/:id/decline', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  const act = activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).send('Not found');
  act.participants = act.participants || [];
  const idx = act.participants.indexOf(req.session.userId);
  if (idx !== -1) {
    act.participants.splice(idx, 1);
  }
  act.declined = act.declined || [];
  if (!act.declined.includes(req.session.userId)) {
    act.declined.push(req.session.userId);
  }
  await saveActivities(activities);
  broadcast({
    type: 'decline',
    activityId: act.id,
    userId: req.session.userId
  });
  
  res.sendStatus(200);
});

app.post('/activities/:id/restore', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  const act = activities.find((a) => a.id === req.params.id);
  if (!act) return res.status(404).send('Not found');
  act.declined = act.declined || [];
  const idx = act.declined.indexOf(req.session.userId);
  if (idx !== -1) {
    act.declined.splice(idx, 1);
    await saveActivities(activities);
  }
  res.sendStatus(200);
});

app.get('/rejected', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  const rejected = activities.filter((a) => (a.declined || []).includes(req.session.userId));
  let html = '<h1>Abgelehnte Aktivitäten</h1>';
  for (const act of rejected) {
    html += `<div class="mini-card"><h3>${act.title}</h3>` +
            `<form method="POST" action="/activities/${act.id}/restore">` +
            '<button type="submit">Wiederherstellen</button></form></div>';
  }
  res.send(html);
});


if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
