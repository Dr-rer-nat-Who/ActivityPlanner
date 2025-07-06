const express = require('express');
const session = require('express-session');
const csurf = require('csurf');
const argon2 = require('argon2');
const validator = require('validator');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');

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

app.use(
  session({
    secret: 'change_this_secret',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(csurf());

app.get('/', (req, res) => {
  res.send('ActivityPlanner is running!');
});

app.get('/register', (req, res) => {
  const form = `
    <form action="/register" method="POST">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      <div><label>Nutzername: <input name="username" required></label></div>
      <div><label>Passwort: <input type="password" name="password" required></label></div>
      <button type="submit">Registrieren</button>
    </form>
  `;
  res.send(form);
});

app.post('/register', async (req, res) => {
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

  const hash = await argon2.hash(password, { type: argon2.argon2id });
  users.push({ username: sanitizedUsername, password: hash });
  await saveUsers(users);
  res.send('Registrierung erfolgreich.');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
