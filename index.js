import InitWebsocket from "./src/config/websocket";
import dotenv from 'dotenv';
import express from 'express';
import defaultRoute from "./src/routes/default";
import voipRoute from "./src/routes/voip";
import voipRoute from "./src/signaler";
import AppConfig from './src/config';
import initializeSignaler from "./src/signaler";

// Init env
dotenv.config();

// Initialize express app object
var app = express();

// Init App configurations
const { server, app } = AppConfig(app, express);

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
    console.log(`Signaling Server is up and running on ${port} ...`);
});




