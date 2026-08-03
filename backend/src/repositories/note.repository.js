const Note = require("../models/note.model");

const mapNote = (note) => ({
  id: note._id.toString(),
  userId: note.user_id.toString(),
  title: note.title,
  content: note.content,
  contentFormat: note.content_format || "plain",
  color: note.color,
  labels: note.labels || [],
  attachments: note.attachments || [],
  links: note.links || [],
  reminderAt: note.reminder_at || null,
  order: note.order || 0,
  aiSummary: note.ai_summary || "",
  aiTitle: note.ai_title || "",
  smartTags: note.smart_tags || [],
  extractedTasks: note.extracted_tasks || [],
  isPinned: Boolean(note.is_pinned),
  isArchived: Boolean(note.is_archived),
  isTrashed: Boolean(note.is_trashed),
  trashedAt: note.trashed_at || null,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
});

const mapUpdatePayload = (payload) => {
  const fieldMap = {
    title: "title",
    content: "content",
    contentFormat: "content_format",
    color: "color",
    labels: "labels",
    attachments: "attachments",
    links: "links",
    reminderAt: "reminder_at",
    order: "order",
    aiSummary: "ai_summary",
    aiTitle: "ai_title",
    smartTags: "smart_tags",
    extractedTasks: "extracted_tasks",
    isPinned: "is_pinned",
    isArchived: "is_archived",
    isTrashed: "is_trashed",
    trashedAt: "trashed_at",
  };

  return Object.entries(fieldMap).reduce((update, [apiField, dbField]) => {
    if (payload[apiField] !== undefined) {
      update[dbField] = payload[apiField];
    }

    return update;
  }, {});
};

const createNoteRepository = (noteModel = Note) => ({
  async createNote(payload) {
    const createdNote = await noteModel.create({
      user_id: payload.userId,
      title: payload.title,
      content: payload.content,
      content_format: payload.contentFormat,
      color: payload.color,
      labels: payload.labels,
      attachments: payload.attachments,
      links: payload.links,
      reminder_at: payload.reminderAt,
      order: payload.order,
      is_pinned: payload.isPinned,
      is_archived: payload.isArchived,
      is_trashed: payload.isTrashed,
      trashed_at: payload.trashedAt,
    });

    return mapNote(createdNote);
  },

  async findAllByUserId(userId, filters = {}) {
    const query = { user_id: userId };

    if (filters.status === "active") {
      query.is_archived = false;
      query.is_trashed = false;
    } else if (filters.status === "archive") {
      query.is_archived = true;
      query.is_trashed = false;
    } else if (filters.status === "trash") {
      query.is_trashed = true;
    } else if (filters.status === "reminders") {
      query.is_trashed = false;
      query.reminder_at = { $ne: null };
    }

    if (filters.label) {
      query.labels = filters.label;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { content: { $regex: filters.search, $options: "i" } },
        { labels: { $regex: filters.search, $options: "i" } },
      ];
    }

    const limit = Math.min(Number(filters.limit) || 100, 100);
    const skip = Math.max(Number(filters.skip) || 0, 0);
    const sort =
      filters.sort === "created"
        ? { is_pinned: -1, created_at: -1 }
        : filters.sort === "title"
          ? { is_pinned: -1, title: 1 }
          : filters.sort === "order"
            ? { is_pinned: -1, order: 1, updated_at: -1 }
            : { is_pinned: -1, updated_at: -1 };

    const notes = await noteModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return notes.map(mapNote);
  },

  async findLabelsByUserId(userId) {
    const labels = await noteModel.distinct("labels", { user_id: userId });
    return labels.sort((a, b) => a.localeCompare(b));
  },

  async findByIdAndUserId(noteId, userId) {
    const note = await noteModel
      .findOne({ _id: noteId, user_id: userId })
      .lean();

    return note ? mapNote(note) : null;
  },

  async updateByIdAndUserId(noteId, userId, payload) {
    const update = mapUpdatePayload(payload);

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

  async deleteAllByUserId(userId) {
    await noteModel.deleteMany({ user_id: userId });
  },

  async deleteTrashedBefore(userId, beforeDate) {
    await noteModel.deleteMany({
      user_id: userId,
      is_trashed: true,
      trashed_at: { $lte: beforeDate },
    });
  },

  async renameLabelForUser(userId, oldLabel, newLabel) {
    const notes = await noteModel
      .find({ user_id: userId, labels: oldLabel })
      .select("_id labels")
      .lean();

    await Promise.all(
      notes.map((note) => {
        const nextLabels = Array.from(
          new Set(
            note.labels.map((label) =>
              label === oldLabel ? newLabel : label,
            ),
          ),
        );

        return noteModel.updateOne(
          { _id: note._id, user_id: userId },
          { labels: nextLabels },
        );
      }),
    );
  },
});

module.exports = {
  createNoteRepository,
};
