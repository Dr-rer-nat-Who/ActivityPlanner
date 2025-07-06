const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const actions = [];

app.post('/action', (req, res) => {
  const { title, description, user } = req.body;
  if (!title) return res.status(400).send('Missing title');
  const action = {
    id: Date.now(),
    title,
    description,
    user: user || 'Unbekannt',
    createdAt: Date.now()
  };
  actions.unshift(action);
  io.emit('action', action);
  res.status(201).json(action);
});

io.on('connection', (socket) => {
  socket.emit('init', actions);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
