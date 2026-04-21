const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.logLevel,
  redact: ["req.headers.authorization"],
});

module.exports = logger;
