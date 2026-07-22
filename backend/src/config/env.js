const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notes_app",
  jwt: {
    secret: process.env.JWT_SECRET || "dev_jwt_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
};

module.exports = env;
