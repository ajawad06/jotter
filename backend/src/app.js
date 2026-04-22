const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");

const logger = require("./config/logger");
const authRoutes = require("./routes/auth.routes");
const healthRoutes = require("./routes/health.routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} completed with ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} failed: ${err.message}`,
  }),
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
