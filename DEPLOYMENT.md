# Deploy to Internet

## Option 1: Render (Free, Easiest)

1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repo
5. Settings:
   - Build: `cd server && npm install`
   - Start: `cd server && node server.js`
   - Add env var: `MONGODB_URI` (your Atlas URL)
6. Deploy!

Your app URL: `https://yourapp.onrender.com`

## Option 2: Railway (Free)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add MongoDB URI in variables
4. Deploy!

## Option 3: Local Network (Free, No Deploy)

**Find your IP:**
```bash
ipconfig
```
Look for IPv4 Address (e.g., 192.168.1.5)

**Update client.js:**
Change `localhost` to your IP:
```js
window.socket = io('http://192.168.1.5:3000');
```

**Share with others on same WiFi:**
- They visit: `http://192.168.1.5:3000`
- Works on phones, tablets, other computers

## Current Status

✓ MongoDB Atlas (cloud database) - works globally
✓ Socket.io real-time messaging
✓ Room codes for private chats
✗ Server on localhost - only you can access

**Deploy to make it accessible from anywhere!**
