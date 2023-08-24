import socket from "socket.io";
import CORSConfiguration from "./connection.js";

function InitWebsocket(server) {
  const io = socket(server, {
    cors: {
      origin: CORSConfiguration(),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["user-agent"],
      credentials: true,
    },
  });

  return io;
}

export default InitWebsocket;
