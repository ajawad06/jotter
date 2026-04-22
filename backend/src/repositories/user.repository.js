const { getPool } = require("../db/mysql");

const createUserRepository = (db = getPool()) => ({
  async findByEmail(email) {
    const [rows] = await db.execute(
      "SELECT id, name, email, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    return rows[0] || null;
  },

  async createUser({ name, email, passwordHash }) {
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash],
    );

    return {
      id: result.insertId,
      name,
      email,
    };
  },
});

module.exports = {
  createUserRepository,
};
