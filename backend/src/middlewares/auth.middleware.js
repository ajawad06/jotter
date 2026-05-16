const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AppError = require("../utils/appError");

const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authorization token is missing", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};

module.exports = {
  authenticate,
};
