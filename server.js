const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["user-agent"],
        credentials: true,
    },
});

app.use(cors());

io.on("connection", (socket) => {
    if (!io.custom) io.custom = {};
    if (!io.custom.rooms) io.custom.rooms = [];

    socket.on("join room", (userJoin, roomCode) => {

        if (!io.custom.rooms[roomCode]) io.custom.rooms[roomCode] = [];
        if (io.custom.rooms[roomCode].find((user) => user.id === userJoin.id)) return;
        if (io.custom.rooms[roomCode].length >= 2) return;

        socket.joined_room = roomCode;
        io.custom.rooms[roomCode].push({ ...userJoin, socketId: socket.id });

        const otherUser = io.custom.rooms[roomCode].find((user) => user.id !== userJoin.id);
        if (otherUser) {
            socket.emit("user call", otherUser.socketId);
            socket.to(otherUser.socketId).emit("user joined", socket.id);
        }
    });

    socket.on("offer", (payload) => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", (payload) => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", (incoming) => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });

    socket.on("disconnecting", () => {
        if (!io.custom) return;
        if (!io.custom.rooms) return;
        if (!io.custom.rooms[socket.joined_room]) return;

        const userSocket = io.custom.rooms[socket.joined_room].find((user) => user.socketId === socket.id);
        if (!userSocket) return;

        const socketIndex = io.custom.rooms[socket.joined_room].indexOf(userSocket);
        if (socketIndex > -1) io.custom.rooms[socket.joined_room].splice(socketIndex, 1);
    });
});

const port = process.env.PORT || 8000;
server.listen(8000, () => console.log(`server is running on port ${port}`));
