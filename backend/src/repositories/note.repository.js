const { getPool } = require("../db/mysql");

const NOTE_SELECT_FIELDS =
  "id, user_id AS userId, title, content, color, is_pinned AS isPinned, is_archived AS isArchived, is_trashed AS isTrashed, created_at AS createdAt, updated_at AS updatedAt";

const createNoteRepository = (db = getPool()) => ({
  async createNote({
    userId,
    title,
    content,
    color,
    isPinned,
    isArchived,
    isTrashed,
  }) {
    const [result] = await db.execute(
      "INSERT INTO notes (user_id, title, content, color, is_pinned, is_archived, is_trashed) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, title, content, color, isPinned, isArchived, isTrashed],
    );

    return {
      id: result.insertId,
      userId,
      title,
      content,
      color,
      isPinned,
      isArchived,
      isTrashed,
    };
  },

  async findAllByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT ${NOTE_SELECT_FIELDS} FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC`,
      [userId],
    );

    return rows;
  },

  async findByIdAndUserId(noteId, userId) {
    const [rows] = await db.execute(
      `SELECT ${NOTE_SELECT_FIELDS} FROM notes WHERE id = ? AND user_id = ? LIMIT 1`,
      [noteId, userId],
    );

    return rows[0] || null;
  },

  async updateByIdAndUserId(noteId, userId, fields) {
    const updates = [];
    const values = [];

    if (Object.hasOwn(fields, "title")) {
      updates.push("title = ?");
      values.push(fields.title);
    }

    if (Object.hasOwn(fields, "content")) {
      updates.push("content = ?");
      values.push(fields.content);
    }

    if (Object.hasOwn(fields, "color")) {
      updates.push("color = ?");
      values.push(fields.color);
    }

    if (Object.hasOwn(fields, "isPinned")) {
      updates.push("is_pinned = ?");
      values.push(fields.isPinned);
    }

    if (Object.hasOwn(fields, "isArchived")) {
      updates.push("is_archived = ?");
      values.push(fields.isArchived);
    }

    if (Object.hasOwn(fields, "isTrashed")) {
      updates.push("is_trashed = ?");
      values.push(fields.isTrashed);
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(noteId, userId);

    const [result] = await db.execute(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
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
