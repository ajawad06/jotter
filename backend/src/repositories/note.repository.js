const Note = require("../models/note.model");

const mapNote = (note) => ({
  id: note._id.toString(),
  userId: note.user_id.toString(),
  title: note.title,
  content: note.content,
  color: note.color,
  isPinned: Boolean(note.is_pinned),
  isArchived: Boolean(note.is_archived),
  isTrashed: Boolean(note.is_trashed),
  createdAt: note.created_at,
  updatedAt: note.updated_at,
});

const createNoteRepository = (noteModel = Note) => ({
  async createNote({
    userId,
    title,
    content,
    color,
    isPinned,
    isArchived,
    isTrashed,
  }) {
    const createdNote = await noteModel.create({
      user_id: userId,
      title,
      content,
      color,
      is_pinned: isPinned,
      is_archived: isArchived,
      is_trashed: isTrashed,
    });

    return mapNote(createdNote);
  },

  async findAllByUserId(userId) {
    const notes = await noteModel
      .find({ user_id: userId })
      .sort({ is_pinned: -1, updated_at: -1 })
      .lean();

    return notes.map(mapNote);
  },

  async findByIdAndUserId(noteId, userId) {
    const note = await noteModel
      .findOne({ _id: noteId, user_id: userId })
      .lean();

    return note ? mapNote(note) : null;
  },

  async updateByIdAndUserId(noteId, userId, payload) {
    const update = {};

    if (payload.title !== undefined) {
      update.title = payload.title;
    }

    if (payload.content !== undefined) {
      update.content = payload.content;
    }

    if (payload.color !== undefined) {
      update.color = payload.color;
    }

    if (payload.isPinned !== undefined) {
      update.is_pinned = payload.isPinned;
    }

    if (payload.isArchived !== undefined) {
      update.is_archived = payload.isArchived;
    }

    if (payload.isTrashed !== undefined) {
      update.is_trashed = payload.isTrashed;
    }

    if (Object.keys(update).length === 0) {
      return false;
    }

    const result = await noteModel.updateOne(
      { _id: noteId, user_id: userId },
      update,
    );

    return result.modifiedCount > 0 || result.matchedCount > 0;
  },

  async deleteByIdAndUserId(noteId, userId) {
    const result = await noteModel.deleteOne({ _id: noteId, user_id: userId });

    return result.deletedCount > 0;
  },
});

module.exports = {
  createNoteRepository,
};
