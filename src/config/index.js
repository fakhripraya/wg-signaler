import cors from "cors";
import CORSConfiguration from "./connection.js";
import cookieParser from "cookie-parser";
import logger from "morgan";
import https from "httpolyglot";
import http from "http";
import fs from "fs";
import pluralize from "pluralize";

const AppConfig = (app, express) => {
  // env
  const APP_ENABLE_LOCAL_HTTPS =
    process.env.APP_ENABLE_LOCAL_HTTPS;
  const APP_CERT_PATH = process.env.APP_CERT_PATH;
  const APP_KEY_PATH = process.env.APP_KEY_PATH;

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

  // Initialize HTTP/HTTPS server
  // SSL cert for HTTPS access
  // (this is for test purposes and will not be used on production app)
  let server = http.createServer(app);
  if (APP_ENABLE_LOCAL_HTTPS) {
    const options = {
      key: fs.readFileSync(APP_KEY_PATH, "utf-8"),
      cert: fs.readFileSync(APP_CERT_PATH, "utf-8"),
    };
    server = https.createServer(options, app);
  }
  return { server, app };
};

export default AppConfig;
