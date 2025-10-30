const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const messages = {};
const users = {};
const rooms = {};

app.get('/api/messages/:chatId', (req, res) => {
  res.json(messages[req.params.chatId] || []);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    socket.username = username;
    users[username] = { username, online: true };
    io.emit('userStatus', { username, online: true });
  });

  socket.on('sendMessage', (data) => {
    if (!messages[data.chatId]) messages[data.chatId] = [];
    const message = { ...data, timestamp: new Date() };
    messages[data.chatId].push(message);
    io.emit('newMessage', message);
  });

  socket.on('createRoom', (roomCode) => {
    rooms[roomCode] = { creator: socket.id, users: [socket.id] };
    socket.join(roomCode);
    socket.roomCode = roomCode;
  });

  socket.on('joinRoom', ({ roomCode, username }) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      socket.roomCode = roomCode;
      rooms[roomCode].users.push(socket.id);
      io.to(roomCode).emit('userJoinedRoom', { roomCode, username });
      socket.emit('roomJoined');
    } else {
      socket.emit('roomNotFound');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomCode && rooms[socket.roomCode]) {
      delete rooms[socket.roomCode];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});
