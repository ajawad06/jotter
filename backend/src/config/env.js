const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "notes_app",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev_jwt_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
};

module.exports = env;
