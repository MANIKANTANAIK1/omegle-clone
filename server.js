const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let waitingUser = null;

io.on('connection', socket => {
  console.log('New user connected:', socket.id);

  if (waitingUser) {
    // Pair users
    const room = `${socket.id}#${waitingUser.id}`;
    socket.join(room);
    waitingUser.join(room);

    socket.emit('partner-found', room);
    waitingUser.emit('partner-found', room);

    // Clear waiting user
    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  socket.on('signal', data => {
    socket.to(data.room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    socket.broadcast.emit('partner-disconnected');
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
