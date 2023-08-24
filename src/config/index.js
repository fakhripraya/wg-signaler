import cors from "cors";
import CORSConfiguration from "./connection.js";
import cookieParser from "cookie-parser";
import logger from "morgan";
import https from "httpolyglot";
import http from "http";
import { DEV } from "../variables/general.js";
import fs from "fs";
import pluralize from "pluralize";

const AppConfig = (app, express) => {
  // env
  const APP_STATE = process.env.APP_STATE;
  // Express app config
  app.locals.pluralize = pluralize;
  app.use(logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // CORS establishment
  app.use(
    cors({
      origin: CORSConfiguration(),
      credentials: true,
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    })
  );

  // Tool to parse cookie
  app.use(cookieParser());

  // Global Middleware
  app.use((err, req, res, next) => {
    res.status(500).send("Something went wrong!");
  });

  // Initialize HTTP/HTTPS server
  // SSL cert for HTTPS access
  // (this is for test purposes and will not be used on production app)
  let server = http.createServer(app);
  if (APP_STATE === DEV) {
    const options = {
      key: fs.readFileSync("./ssl/key.pem", "utf-8"),
      cert: fs.readFileSync("./ssl/cert.pem", "utf-8"),
    };
    server = https.createServer(options, app);
  }
  return { server, app };
};

export default AppConfig;
