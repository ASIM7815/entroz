# Meez Chat App - Custom Backend

## Setup Instructions

### 1. Install MongoDB
Download and install MongoDB from: https://www.mongodb.com/try/download/community

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Start MongoDB
```bash
mongod
```

### 4. Start Server
```bash
cd server
npm start
```

Server runs on: http://localhost:3000

### 5. Open App
Open `index.html` in your browser

## Features
- Real-time messaging with Socket.io
- MongoDB database storage
- User online status
- Message history
- No Firebase dependency

## API Endpoints
- GET `/api/messages/:chatId` - Get chat messages
- GET `/api/users` - Get all users

## Socket Events
- `join` - User connects
- `sendMessage` - Send a message
- `newMessage` - Receive messages
- `userStatus` - User online/offline updates
