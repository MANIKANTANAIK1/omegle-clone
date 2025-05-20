const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidV4 } = require('uuid');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// Serve the client HTML on any path (room)
app.get('/:room', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Redirect root to a unique room
app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

io.on('connection', socket => {
  let currentRoom = null;

  socket.on('join-room', (roomId, userId) => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }

    currentRoom = roomId;
    socket.join(roomId);

    // Notify others in room of new user
    socket.to(roomId).emit('user-connected', userId);

    // Handle disconnect inside this room
    socket.on('disconnect', () => {
      if (currentRoom) {
        socket.to(currentRoom).emit('user-disconnected', userId);
      }
    });
  });

  socket.on('next-user', (oldRoomId, userId) => {
    // Leave old room
    socket.leave(oldRoomId);

    // Join a new unique room
    const newRoomId = uuidV4();
    currentRoom = newRoomId;
    socket.join(newRoomId);

    // Tell client to update URL and reset state
    socket.emit('new-room', newRoomId);
  });

  // Relay chat messages to others in same room
  socket.on('chat-message', (message, userId) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('chat-message', message, userId);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
