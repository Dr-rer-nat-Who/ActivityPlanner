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

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const ASSET_DIR = path.join(__dirname, 'user-assets');

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

app.use(express.urlencoded({ extended: false }));
app.use(express.static(ASSET_DIR));

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


app.get('/', (req, res) => {
  res.send('ActivityPlanner is running!');
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


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

module.exports = app;
