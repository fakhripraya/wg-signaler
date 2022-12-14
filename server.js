const { ROOM_FULL, ROOM_AVAILABLE, USER_ALREADY_JOIN, ROOM_UNAVAILABLE } = require("./variables/global");
const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const { randomUUID } = require("crypto");
const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["user-agent"],
        credentials: true,
    },
});

app.use(express.json());
app.use(cors());
const rooms = [];

io.on("connection", (socket) => {
    socket.on("join room", (userJoin, roomCode) => {

        if (rooms[roomCode].users.find((user) => user.id === userJoin.id)) return;
        if (rooms[roomCode].users.length >= 2) socket.emit("rdp error", ROOM_FULL);

        socket.joinedRoom = roomCode;
        rooms[roomCode].users.push({ ...userJoin, socketId: socket.id });

        const otherUser = rooms[roomCode].users.find((user) => user.id !== userJoin.id);
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
        if (!rooms[socket.joinedRoom]) return;

        const userSocket = rooms[socket.joinedRoom].users.find((user) => user.socketId === socket.id);
        if (!userSocket) return;

        const socketIndex = rooms[socket.joinedRoom].users.indexOf(userSocket);
        if (socketIndex > -1) rooms[socket.joinedRoom].users.splice(socketIndex, 1);
    });
});

// GET method route
app.get('/v1/room/check', (req, res) => {

    // check query param availability
    if (!req.query) return res.sendStatus(400);

    // Retrieve the tag from our URL path
    const query = {
        user: {
            id: req.query.userId,
        },
        roomCode: req.query.roomCode
    };

    if (!rooms[query.roomCode]) return res.send(JSON.stringify({
        code: ROOM_UNAVAILABLE
    })).status(200);

    if (rooms[query.roomCode].users.find((user) => user.id === query.user.id)) return res.send(JSON.stringify({
        code: USER_ALREADY_JOIN
    })).status(403);

    if (rooms[query.roomCode].users.length >= 2) return res.send(JSON.stringify({
        code: ROOM_FULL
    })).status(403);

    return res.send(JSON.stringify({
        code: ROOM_AVAILABLE
    })).status(200);
})

// POST method route
app.post('/v1/room/create', (req, res) => {

    // check request body availability
    if (!req.body) return res.sendStatus(400);

    // Retrieve the request body
    const user = req.body.user;

    // create random crypted uuid
    const roomCode = randomUUID();

    rooms[roomCode] = {
        users: [],
        created_at: new Date(),
        created_by: user.id
    };

    return res.send(JSON.stringify({
        roomCode: roomCode
    })).status(200);
})

const port = process.env.PORT || 8000;
server.listen(8000, () => console.log(`server is running on port ${port}`));
