const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meez', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✓ Connected to MongoDB Atlas'))
  .catch(err => console.error('✗ MongoDB connection error:', err));

// Schemas
const messageSchema = new mongoose.Schema({
  chatId: String,
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: String,
  avatar: String,
  online: { type: Boolean, default: false },
  lastSeen: Date
});

const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('User', userSchema);

// REST API
app.get('/api/messages/:chatId', async (req, res) => {
  const messages = await Message.find({ chatId: req.params.chatId }).sort({ timestamp: 1 });
  res.json(messages);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Socket.io
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (username) => {
    socket.username = username;
    await User.findOneAndUpdate({ username }, { online: true }, { upsert: true });
    io.emit('userStatus', { username, online: true });
  });

  socket.on('sendMessage', async (data) => {
    const message = new Message(data);
    await message.save();
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

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomCode && rooms[socket.roomCode]) {
      delete rooms[socket.roomCode];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ MongoDB: ${process.env.MONGODB_URI ? 'Atlas' : 'Local'}`);
});
