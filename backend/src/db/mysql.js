const mysql = require("mysql2/promise");
const env = require("../config/env");
const logger = require("../config/logger");

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
};

const verifyConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    connection.release();
    logger.info("Database connection verified");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Database connection failed");
    return false;
  }
};

module.exports = {
  getPool,
  verifyConnection,
};
