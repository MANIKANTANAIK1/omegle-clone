const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidV4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const rooms = {}; // roomId -> [userIds]

io.on("connection", socket => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);

    // Track room participants
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(userId);

    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);

      // Remove user from room list
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== userId);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    });

    // Chat message relay
    socket.on("chat-message", (message, userId) => {
      socket.to(roomId).emit("chat-message", message, userId);
    });

    // Next button: Leave current room, create new room for this user
    socket.on("next-user", (currentRoom, userId) => {
      // Leave current room
      socket.leave(currentRoom);

      // Remove user from old room tracking
      if (rooms[currentRoom]) {
        rooms[currentRoom] = rooms[currentRoom].filter(id => id !== userId);
        if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
      }

      // Create new roomId and join
      const newRoomId = uuidV4();
      socket.join(newRoomId);
      rooms[newRoomId] = [userId];

      // Notify user about new room
      socket.emit("new-room", newRoomId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
