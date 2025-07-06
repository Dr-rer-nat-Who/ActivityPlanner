const express = require('express');
const session = require('express-session');
const csrf = require('csurf');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const argon2 = require('argon2');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 3000;

// session middleware
app.use(session({
  secret: 'change_this_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: false }));

// CSRF protection
const csrfProtection = csrf();
app.use(csrfProtection);

let db;
(async () => {
  db = await open({ filename: './database.sqlite', driver: sqlite3.Database });
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
})();

app.get('/register', (req, res) => {
  const form = `<!doctype html>
<html><body>
<form method="POST" action="/register">
<input type="hidden" name="_csrf" value="${req.csrfToken()}">
<label>Nutzername: <input name="username" minlength="3" maxlength="20" required></label><br>
<label>Passwort: <input name="password" type="password" minlength="10" required></label><br>
<button type="submit">Registrieren</button>
</form>
</body></html>`;
  res.send(form);
});

app.post('/register',
  body('username').trim().isLength({ min: 3, max: 20 }).escape(),
  body('password').isLength({ min: 10 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send('Ungültige Eingabe');
    }
    const username = req.body.username;
    const password = req.body.password;
    try {
      const hash = await argon2.hash(password, { type: argon2.argon2id });
      await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hash);
      res.send('Registrierung erfolgreich');
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        res.status(409).send('Nutzername bereits vergeben');
      } else {
        res.status(500).send('Serverfehler');
      }
    }
  });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
