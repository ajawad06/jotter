const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const { verifyMongoConnection } = require("./db/mongodb");

const startServer = async () => {
  await verifyMongoConnection();

  const server = app.listen(env.port, () => {
    logger.info(`Backend server running on port ${env.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down server.`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

startServer();
