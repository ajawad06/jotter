const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  void next;
  const statusCode = err.statusCode || 500;
  // Use "Internal server error" for 500s unless in dev, or if it's already set to something specific
  const message =
    statusCode === 500
      ? "Internal server error"
      : err.message || "Internal server error";

  if (statusCode >= 500) {
    logger.error(
      {
        err: {
          message: err.message,
          stack: err.stack,
          ...err,
        },
        method: req.method,
        path: req.originalUrl,
        requestId: req.id,
      },
      "Unhandled application error",
    );
  } else {
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message,
      },
      "Operational error",
    );
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
