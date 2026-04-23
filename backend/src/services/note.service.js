const AppError = require("../utils/appError");

const createNoteService = ({ noteRepository }) => ({
  async createNote(userId, payload) {
    const title = payload?.title?.trim();
    const content = payload?.content?.trim();

    if (!title || !content) {
      throw new AppError("Title and content are required", 400);
    }

    return noteRepository.createNote({
      userId,
      title,
      content,
    });
  },

  async listUserNotes(userId) {
    return noteRepository.findAllByUserId(userId);
  },

  async getUserNote(userId, noteId) {
    const note = await noteRepository.findByIdAndUserId(noteId, userId);

    if (!note) {
      throw new AppError("Note not found", 404);
    }

    return note;
  },

  async updateUserNote(userId, noteId, payload) {
    const title = payload?.title?.trim();
    const content = payload?.content?.trim();

    if (!title || !content) {
      throw new AppError("Title and content are required", 400);
    }

    const updated = await noteRepository.updateByIdAndUserId(noteId, userId, {
      title,
      content,
    });

    if (!updated) {
      throw new AppError("Note not found", 404);
    }

    return noteRepository.findByIdAndUserId(noteId, userId);
  },

  async deleteUserNote(userId, noteId) {
    const deleted = await noteRepository.deleteByIdAndUserId(noteId, userId);

    if (!deleted) {
      throw new AppError("Note not found", 404);
    }

    return { deleted: true };
  },
});

module.exports = {
  createNoteService,
};
