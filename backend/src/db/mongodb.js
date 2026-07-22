const mongoose = require("mongoose");

const env = require("../config/env");
const logger = require("../config/logger");

const connectMongo = async () => {
  await mongoose.connect(env.mongoUri);
};

const verifyMongoConnection = async () => {
  try {
    await connectMongo();
    logger.info("MongoDB connection verified");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to MongoDB");
    throw error;
  }
};

module.exports = {
  connectMongo,
  verifyMongoConnection,
};
