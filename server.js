const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const rooms = {};

io.on("connection", socket => {
    socket.on("join room", (userJoin, roomCode) => {

        console.log(newSocket)
        console.log(rooms)
        if (!rooms[roomCode]) rooms[roomCode] = [];
        if (rooms[roomCode].find(user => user.id === userJoin.id)) return;

        rooms[roomCode].push(userJoin);
        const otherUser = rooms[roomCode].find(user => user.id !== userJoin.id);
        if (otherUser) {
            socket.emit("other user", otherUser);
            socket.to(otherUser).emit("user joined", socket.id);
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
