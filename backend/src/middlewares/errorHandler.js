const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  void next;
  logger.error(
    {
      err,
      method: req.method,
      path: req.originalUrl,
      requestId: req.id,
    },
    "Unhandled application error",
  );

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
