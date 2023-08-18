import socket from "socket.io";

function InitWebsocket(server) {
  const io = socket(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["user-agent"],
      credentials: true,
    },
  });

  return io;
}

export default InitWebsocket;
