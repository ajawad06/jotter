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
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  email: {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "Jotter <no-reply@jotter.app>",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

module.exports = env;
