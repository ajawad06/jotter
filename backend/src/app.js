const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");

const logger = require("./config/logger");
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const noteRoutes = require("./routes/note.routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use(
  pinoHttp({
    logger,
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} completed with ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} failed: ${err.message}`,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        // Body is sensitive, usually excluded or redacted in production
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    genReqId: (req) =>
      req.headers["x-request-id"] || Math.random().toString(36).substring(7),
  }),
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
