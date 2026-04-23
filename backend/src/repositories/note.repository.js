const { getPool } = require("../db/mysql");

const createNoteRepository = (db = getPool()) => ({
  async createNote({ userId, title, content }) {
    const [result] = await db.execute(
      "INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)",
      [userId, title, content],
    );

    return {
      id: result.insertId,
      userId,
      title,
      content,
    };
  },

  async findAllByUserId(userId) {
    const [rows] = await db.execute(
      "SELECT id, user_id AS userId, title, content, created_at AS createdAt, updated_at AS updatedAt FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
      [userId],
    );

    return rows;
  },

  async findByIdAndUserId(noteId, userId) {
    const [rows] = await db.execute(
      "SELECT id, user_id AS userId, title, content, created_at AS createdAt, updated_at AS updatedAt FROM notes WHERE id = ? AND user_id = ? LIMIT 1",
      [noteId, userId],
    );

    return rows[0] || null;
  },

  async updateByIdAndUserId(noteId, userId, { title, content }) {
    const [result] = await db.execute(
      "UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?",
      [title, content, noteId, userId],
    );

    return result.affectedRows > 0;
  },

  async deleteByIdAndUserId(noteId, userId) {
    const [result] = await db.execute(
      "DELETE FROM notes WHERE id = ? AND user_id = ?",
      [noteId, userId],
    );

    return result.affectedRows > 0;
  },
});

module.exports = {
  createNoteRepository,
};
