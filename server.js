const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// In-memory user store (username: hashedPassword)
const users = {
  alice: bcrypt.hashSync('password123', 10),
};

// Track failed login attempts
const loginAttempts = {};
const MAX_ATTEMPTS = 3;
const LOCK_TIME = 5 * 60 * 1000; // 5 minutes

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    rolling: true, // refresh cookie on each request
    cookie: {
      maxAge: 10 * 60 * 1000, // 10 minutes
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

function requireAuth(req, res, next) {
  if (req.session.username) {
    return next();
  }
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const attempt = loginAttempts[username] || { count: 0, lockUntil: 0 };

  if (Date.now() < attempt.lockUntil) {
    return res.status(429).send('Too many attempts. Please try again later.');
  }

  if (!users[username]) {
    return res.status(401).send('Invalid credentials');
  }

  const match = await bcrypt.compare(password, users[username]);
  if (match) {
    loginAttempts[username] = { count: 0, lockUntil: 0 };
    req.session.username = username;
    return res.redirect('/activities');
  } else {
    attempt.count += 1;
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockUntil = Date.now() + LOCK_TIME;
    }
    loginAttempts[username] = attempt;
    return res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/activities', requireAuth, (req, res) => {
  res.send(`<h1>Welcome, ${req.session.username}</h1><p>Your activities will appear here.</p><a href="/logout">Logout</a>`);
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
