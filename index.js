import express from "express";
import InitWebsocket from "./src/config/websocket.js";
import dotenv from "dotenv";
import defaultRoute from "./src/routes/default.js";
import voipRoute from "./src/routes/voip.js";
import AppConfig from "./src/config/index.js";
import initializeSignaler from "./src/signaler/index.js";

// Init env
dotenv.config();

// Initialize express app object
const expressApp = express();

// Init App configurations
const { server, app } = AppConfig(expressApp, express);

// websocket initialization
const io = InitWebsocket(server);

// Init Routes
defaultRoute(app);
voipRoute(app);

// Init Signaler
initializeSignaler(io);

// Server listen
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(
    `Signaling Server is up and running on ${port} ...`
  );
});
