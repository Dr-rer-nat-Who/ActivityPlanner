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
const webpush = require('web-push');
const helmet = require('helmet');
const ESAPI = require('node-esapi');
const Database = require('better-sqlite3');

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
const SUBS_FILE = path.join(__dirname, 'data', 'subscriptions.json');
const VAPID_FILE = path.join(__dirname, 'data', 'vapid.json');

fs.mkdir(ASSET_DIR, { recursive: true }).catch(() => {});
let vapidKeys;

async function ensureVapid() {
  try {
    vapidKeys = JSON.parse(await fs.readFile(VAPID_FILE, 'utf8'));
  } catch {
    vapidKeys = webpush.generateVAPIDKeys();
    await fs.writeFile(VAPID_FILE, JSON.stringify(vapidKeys));
  }
  webpush.setVapidDetails('mailto:none@example.com', vapidKeys.publicKey, vapidKeys.privateKey);
}
ensureVapid();

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

async function cleanupReady(users) {
  const now = Date.now();
  let changed = false;
  for (const u of users) {
    if (u.readyUntil && u.readyUntil < now) {
      delete u.readyUntil;
      changed = true;
    }
  }
  if (changed) await saveUsers(users);
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

async function cleanupExpired(activities) {
  const now = Date.now();
  let changed = false;
  for (const act of activities) {
    if (act.expiresAt && now > act.expiresAt && !act.past) {
      act.past = true;
      changed = true;
    }
    if (!act.expiresAt && new Date(act.date).getTime() < now && !act.past) {
      act.past = true;
      changed = true;
    }
  }
  if (changed) await saveActivities(activities);
}

async function loadSubscriptions() {
  try {
    const data = await fs.readFile(SUBS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveSubscriptions(subs) {
  await fs.writeFile(SUBS_FILE, JSON.stringify(subs, null, 2));
}

async function sendPush(userId, payload) {
  const subs = await loadSubscriptions();
  const sub = subs[userId];
  if (!sub) return;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      delete subs[userId];
      await saveSubscriptions(subs);
    }
  }
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

function extractLocation(desc) {
  const match = /(?:Ort|Location):\s*(.+)/i.exec(desc || '');
  return match ? validator.escape(match[1].trim()) : '';
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"]
      }
    },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 15552000, includeSubDomains: true }
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  express.static(ASSET_DIR, {
    setHeaders(res) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);
app.use(
  '/static',
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res) {
      res.set('Cache-Control', 'public, max-age=3600');
    },
  })
);

app.get('/assets/:userId/profile', async (req, res) => {
  const dir = path.join(ASSET_DIR, req.params.userId);
  const webp = path.join(dir, 'profile.webp');
  const jpeg = path.join(dir, 'profile.jpg');
  try {
    await fs.access(webp);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(webp);
  } catch {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(jpeg);
  }
});

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
  const src = req.session.userId
    ? `/assets/${req.session.userId}/profile`
    : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/P+BKywAAAABJRU5ErkJggg==";
  let userName = "";
  let readyClass = "false";
  if (req.session.userId) {
    const users = await loadUsers();
    const u = users.find((u) => u.id === req.session.userId);
    if (u) {
      userName = u.username;
      if (u.readyUntil && u.readyUntil > Date.now()) readyClass = "true";
    }
  }
  html = html
    .replace("{{PROFILE_SRC}}", src)
    .replace("{{USER_ID}}", req.session.userId || '')
    .replace("{{USERNAME}}", userName)
    .replace("{{READY}}", readyClass)
    .replace("{{VAPID}}", vapidKeys.publicKey);
  res.type("html").send(html);
});



app.get('/register', csurf(), async (req, res) => {
  let html = await fs.readFile(path.join(__dirname, 'public', 'register.html'), 'utf8');
  html = html.replace('{{CSRF}}', req.csrfToken());
  res.type('html').send(html);
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

  const sanitizedUsername = ESAPI.encoder().encodeForHTML(username);
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
  const imgSharp = sharp(req.file.buffer)
    .resize(1920, 1080, { fit: 'inside' })
    .resize(512, 512, { fit: 'cover' });
  let ext = 'jpg';
  if (req.file.mimetype === 'image/png') {
    ext = 'webp';
    await imgSharp.toFormat('webp', { quality: 80 }).toFile(
      path.join(userDir, 'profile.webp')
    );
  } else {
    await imgSharp.jpeg({ quality: 80 }).toFile(path.join(userDir, 'profile.jpg'));
  }
  res.redirect(303, '/login');
});

const loginAttempts = {};

app.get('/login', csurf(), async (req, res) => {
  let html = await fs.readFile(path.join(__dirname, 'public', 'login.html'), 'utf8');
  html = html.replace('{{CSRF}}', req.csrfToken());
  res.type('html').send(html);
});

app.post('/login', csurf(), async (req, res) => {
  const username = ESAPI.encoder().encodeForHTML(validator.trim(req.body.username || '')).toLowerCase();
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
  res.redirect(303, '/');
});

app.get('/vapid-key', (req, res) => {
  res.json({ key: vapidKeys.publicKey });
});

app.post('/subscribe', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const subs = await loadSubscriptions();
  subs[req.session.userId] = req.body;
  await saveSubscriptions(subs);
  res.sendStatus(201);
});

app.post('/ping/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const users = await loadUsers();
  const target = users.find((u) => u.id === req.params.id);
  const sender = users.find((u) => u.id === req.session.userId);
  if (!target || !sender) return res.status(404).send('Not found');
  await sendPush(target.id, {
    title: 'Erwähnung',
    body: `${sender.username} hat dich erwähnt`,
  });
  res.sendStatus(200);
});

app.get('/ready', async (req, res) => {
  const users = await loadUsers();
  await cleanupReady(users);
  const ready = users
    .filter((u) => u.readyUntil && u.readyUntil > Date.now())
    .map((u) => ({ id: u.id, username: u.username }));
  res.json(ready);
});

app.post('/ready', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const users = await loadUsers();
  const u = users.find((usr) => usr.id === req.session.userId);
  if (!u) return res.status(404).send('Not found');
  let ready;
  if (u.readyUntil && u.readyUntil > Date.now()) {
    delete u.readyUntil;
    ready = false;
  } else {
    const expires =
      process.env.NODE_ENV === 'test' && req.body.expiresIn !== undefined
        ? Date.now() + Number(req.body.expiresIn)
        : Date.now() + 2 * 60 * 60 * 1000;
    u.readyUntil = expires;
    ready = true;
  }
  await saveUsers(users);
  await cleanupReady(users);
  const list = users
    .filter((usr) => usr.readyUntil && usr.readyUntil > Date.now())
    .map((usr) => ({ id: usr.id, username: usr.username }));
  broadcast({ type: 'ready', users: list });
  res.json({ ready, users: list });
});

app.get('/usernames', async (req, res) => {
  const prefix = req.query.prefix || '';
  const users = await loadUsers();
  const db = new Database(':memory:');
  db.prepare('CREATE TABLE users(id TEXT, username TEXT)').run();
  const ins = db.prepare('INSERT INTO users(id, username) VALUES (?, ?)');
  for (const u of users) ins.run(u.id, u.username);
  const stmt = db.prepare('SELECT username FROM users WHERE username LIKE ?');
  const rows = stmt.all(prefix + '%');
  db.close();
  res.json(rows.map((r) => r.username));
});

app.get('/activities', async (req, res) => {
  const activities = await loadActivities();
  await cleanupExpired(activities);
  activities.sort((a, b) => {
    if (a.quick && !a.past && !b.quick) return -1;
    if (!a.quick && b.quick && !b.past) return 1;
    return new Date(a.date) - new Date(b.date);
  });
  let result = activities.filter((a) => !a.past);
  if (req.session.userId) {
    result = result.filter(
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
    if (act.creator && act.creator !== req.session.userId) {
      await sendPush(act.creator, {
        title: 'Neue Zusage',
        body: `${user ? user.username : ''} ist dabei: ${act.title}`,
      });
    }
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

app.post('/quick-action', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const title = ESAPI.encoder().encodeForHTML(validator.trim(req.body.title || ''));
  const description = ESAPI.encoder().encodeForHTML(validator.trim(req.body.description || ''));
  if (!title) return res.status(400).send('Titel erforderlich');

  const activities = await loadActivities();
  const expires =
    process.env.NODE_ENV === 'test' && req.body.expiresIn
      ? Date.now() + Number(req.body.expiresIn)
      : Date.now() + 6 * 60 * 60 * 1000;
  const obj = {
    id: crypto.randomUUID(),
    title,
    description,
    creator: req.session.userId,
    quick: true,
    date: new Date().toISOString(),
    expiresAt: expires
  };
  activities.unshift(obj);
  await saveActivities(activities);
  const users = await loadUsers();
  const user = users.find((u) => u.id === req.session.userId);
  const subs = await loadSubscriptions();
  for (const uid of Object.keys(subs)) {
    if (uid !== req.session.userId) {
      await sendPush(uid, {
        title: 'Kommt her',
        body: `${user ? user.username : ''}: ${obj.title}`,
      });
    }
  }
  broadcast({ type: 'quick', activity: obj, username: user ? user.username : '' });
  res.json({ id: obj.id });
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

app.get('/past', async (req, res) => {
  const activities = await loadActivities();
  await cleanupExpired(activities);
  const past = activities.filter((a) => a.past);
  let html = '<h1>Vergangene Aktionen</h1>';
  for (const act of past) {
    html += `<div class="mini-card"><h3>${act.title}</h3><p>${validator.escape(act.description || '')}</p></div>`;
  }
  res.send(html);
});

app.get('/history', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const page = Number.parseInt(req.query.page, 10) || 0;
  const activities = await loadActivities();
  await cleanupExpired(activities);
  const past = activities.filter((a) => a.past);
  past.sort((a, b) => new Date(b.date) - new Date(a.date));
  const start = page * 20;
  const slice = past.slice(start, start + 20);
  let html = '<h1>Vergangene Aktivitäten</h1>';
  html += '<table><tr><th>Datum</th><th>Titel</th><th>Teilnahme</th></tr>';
  for (const act of slice) {
    const participated = (act.participants || []).includes(req.session.userId);
    const mark = participated ? '✔' : '✖';
    html += `<tr><td>${new Date(act.date).toLocaleDateString('de-DE')}</td><td>${validator.escape(act.title)}</td><td>${mark}</td></tr>`;
  }
  html += '</table>';
  if (start + 20 < past.length) {
    html += `<a href="/history?page=${page + 1}">Mehr</a>`;
  }
  res.send(html);
});

app.get('/calendar', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  await cleanupExpired(activities);
  const upcoming = activities.filter(
    (a) => !a.past && (a.participants || []).includes(req.session.userId)
  );
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  let html = '<h1>Kalender</h1>';
  html += '<a href="/calendar.ics">ICS Export</a>';
  html +=
    '<div class="calendar-container"><table class="calendar-table"><tr><th>Datum</th><th>Uhrzeit</th><th>Titel</th><th>Ort</th></tr>';
  for (const act of upcoming) {
    const d = new Date(act.date);
    const date = d.toLocaleDateString('de-DE');
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const loc = extractLocation(act.description || '');
    html += `<tr><td>${date}</td><td>${time}</td><td>${validator.escape(act.title)}</td><td>${loc}</td></tr>`;
  }
  html += '</table></div>';
  res.send(html);
});

app.get('/calendar.ics', async (req, res) => {
  if (!req.session.userId) return res.status(401).send('Login erforderlich');
  const activities = await loadActivities();
  await cleanupExpired(activities);
  const upcoming = activities.filter(
    (a) => !a.past && (a.participants || []).includes(req.session.userId)
  );
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ActivityPlanner//EN\r\n';
  for (const act of upcoming) {
    const start = new Date(act.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const loc = extractLocation(act.description || '');
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${act.id}\r\n`;
    ics += `DTSTAMP:${fmt(start)}\r\n`;
    ics += `DTSTART:${fmt(start)}\r\n`;
    ics += `DTEND:${fmt(end)}\r\n`;
    ics += `SUMMARY:${act.title}\r\n`;
    if (loc) ics += `LOCATION:${loc}\r\n`;
    ics += 'END:VEVENT\r\n';
  }
  ics += 'END:VCALENDAR\r\n';
  res.type('text/calendar').send(ics);
});


if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
