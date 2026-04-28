const AppError = require("../utils/appError");

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const normalizeBooleanField = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AppError(`${fieldName} must be a boolean`, 400);
  }

  return value;
};

const createNoteService = ({ noteRepository }) => ({
  async createNote(userId, payload) {
    const title = payload?.title?.trim();
    const content = payload?.content?.trim();
    const color = payload?.color?.trim() || "#ffffff";
    const isPinned =
      normalizeBooleanField(payload?.isPinned, "isPinned") ?? false;
    const isArchived =
      normalizeBooleanField(payload?.isArchived, "isArchived") ?? false;
    const isTrashed =
      normalizeBooleanField(payload?.isTrashed, "isTrashed") ?? false;

    if (!title || !content) {
      throw new AppError("Title and content are required", 400);
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      throw new AppError("color must be a valid hex code", 400);
    }

    return noteRepository.createNote({
      userId,
      title,
      content,
      color,
      isPinned,
      isArchived,
      isTrashed,
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
    const fieldsToUpdate = {};

    if (Object.hasOwn(payload, "title")) {
      const title = payload?.title?.trim();

      if (!title) {
        throw new AppError("title cannot be empty", 400);
      }

      fieldsToUpdate.title = title;
    }

    if (Object.hasOwn(payload, "content")) {
      const content = payload?.content?.trim();

      if (!content) {
        throw new AppError("content cannot be empty", 400);
      }

      fieldsToUpdate.content = content;
    }

    if (Object.hasOwn(payload, "color")) {
      const color = payload?.color?.trim();

      if (!color || !HEX_COLOR_REGEX.test(color)) {
        throw new AppError("color must be a valid hex code", 400);
      }

      fieldsToUpdate.color = color;
    }

    if (Object.hasOwn(payload, "isPinned")) {
      fieldsToUpdate.isPinned = normalizeBooleanField(
        payload?.isPinned,
        "isPinned",
      );
    }

    if (Object.hasOwn(payload, "isArchived")) {
      fieldsToUpdate.isArchived = normalizeBooleanField(
        payload?.isArchived,
        "isArchived",
      );
    }

    if (Object.hasOwn(payload, "isTrashed")) {
      fieldsToUpdate.isTrashed = normalizeBooleanField(
        payload?.isTrashed,
        "isTrashed",
      );
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      throw new AppError("At least one valid field is required", 400);
    }

    const updated = await noteRepository.updateByIdAndUserId(
      noteId,
      userId,
      fieldsToUpdate,
    );

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
