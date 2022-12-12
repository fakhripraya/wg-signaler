const express = require("express");
const http = require("http");
const app = express();
app.use(cors());
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const rooms = {};

io.on("connection", socket => {
    socket.on("join room", (userJoin, roomCode) => {
        if (!rooms[roomCode]) rooms[roomCode] = [];
        if (rooms[roomCode].find(user => user.id === userJoin.id)) return;

        rooms[roomCode].push({ ...userJoin, socketId: socket.id });
        const otherUser = rooms[roomCode].find(user => user.id !== userJoin.id);

        if (otherUser) {
            socket.emit("user call", otherUser.socketId);
            socket.to(otherUser.socketId).emit("user joined", socket.id);
        }
    });

    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });
});

const port = process.env.PORT || 8000
server.listen(8000, () => console.log(`server is running on port ${port}`));