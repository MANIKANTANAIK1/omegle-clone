const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingSocket = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  if (waitingSocket) {
    // Pair current socket with waitingSocket
    waitingSocket.partner = socket;
    socket.partner = waitingSocket;

    waitingSocket.emit('partner-found');
    socket.emit('partner-found');

    waitingSocket = null;
  } else {
    waitingSocket = socket;
  }

  socket.on('offer', (data) => {
    if (socket.partner) socket.partner.emit('offer', data);
  });

  socket.on('answer', (data) => {
    if (socket.partner) socket.partner.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    if (socket.partner) socket.partner.emit('ice-candidate', data);
  });

  socket.on('chat', (data) => {
    if (socket.partner) socket.partner.emit('chat', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingSocket === socket) waitingSocket = null;
    if (socket.partner) {
      socket.partner.emit('partner-disconnected');
      socket.partner.partner = null;
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
