const AppError = require("../utils/appError");

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const CONTENT_FORMATS = new Set(["plain", "html", "markdown"]);
const MAX_LABELS = 20;
const MAX_ATTACHMENTS = 10;

const normalizeBooleanField = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AppError(`${fieldName} must be a boolean`, 400);
  }

  return value;
};

const normalizeLabels = (labels = []) => {
  if (!Array.isArray(labels)) {
    throw new AppError("labels must be an array", 400);
  }

  const normalized = labels
    .map((label) => String(label).trim())
    .filter(Boolean)
    .slice(0, MAX_LABELS);

  return [...new Set(normalized)];
};

const normalizeLinks = (links = []) => {
  if (!Array.isArray(links)) {
    throw new AppError("links must be an array", 400);
  }

  return links.map((link) => String(link).trim()).filter(Boolean);
};

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) {
    throw new AppError("attachments must be an array", 400);
  }

  return attachments.slice(0, MAX_ATTACHMENTS).map((attachment) => ({
    id: String(attachment?.id || "").trim(),
    name: String(attachment?.name || "Attachment").trim(),
    url: String(attachment?.url || "").trim(),
    type: String(attachment?.type || "").trim(),
    size: Number(attachment?.size || 0),
    publicId: String(attachment?.publicId || "").trim(),
    resourceType: String(attachment?.resourceType || "").trim(),
  }));
};

const normalizeReminderAt = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const reminderAt = new Date(value);
  if (Number.isNaN(reminderAt.getTime())) {
    throw new AppError("reminderAt must be a valid date", 400);
  }

  return reminderAt;
};

const normalizeContentFormat = (value = "plain") => {
  if (!CONTENT_FORMATS.has(value)) {
    throw new AppError("contentFormat must be plain, html, or markdown", 400);
  }

  return value;
};

const createNoteService = ({ noteRepository, userRepository }) => ({
  async createNote(userId, payload) {
    const title = payload?.title?.trim();
    const content = payload?.content?.trim();
    const color = payload?.color?.trim() || "#ffffff";
    const contentFormat = normalizeContentFormat(payload?.contentFormat);
    const labels = normalizeLabels(payload?.labels);
    const attachments = normalizeAttachments(payload?.attachments);
    const links = normalizeLinks(payload?.links);
    const reminderAt = normalizeReminderAt(payload?.reminderAt);
    const order = Number(payload?.order || 0);
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
      contentFormat,
      color,
      labels,
      attachments,
      links,
      reminderAt,
      order,
      isPinned,
      isArchived,
      isTrashed,
      trashedAt: isTrashed ? new Date() : null,
    });
  },

  async listUserNotes(userId, filters = {}) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (noteRepository.deleteTrashedBefore) {
      await noteRepository.deleteTrashedBefore(userId, cutoff);
    }

    return noteRepository.findAllByUserId(userId, filters);
  },

  async listUserLabels(userId) {
    const noteLabels = await noteRepository.findLabelsByUserId(userId);
    const customLabels = userRepository
      ? await userRepository.getLabels(userId)
      : [];

    return Array.from(new Set([...noteLabels, ...customLabels])).sort(
      (a, b) => a.localeCompare(b),
    );
  },

  async createLabel(userId, name) {
    const trimmed = String(name || "").trim();

    if (!trimmed) {
      throw new AppError("Label name is required", 400);
    }

    await userRepository.addLabel(userId, trimmed);

    return this.listUserLabels(userId);
  },

  async renameLabel(userId, oldName, newName) {
    const trimmedOld = String(oldName || "").trim();
    const trimmedNew = String(newName || "").trim();

    if (!trimmedOld || !trimmedNew) {
      throw new AppError("Label name is required", 400);
    }

    if (trimmedOld !== trimmedNew) {
      await noteRepository.renameLabelForUser(userId, trimmedOld, trimmedNew);
      await userRepository.renameLabel(userId, trimmedOld, trimmedNew);
    }

    return this.listUserLabels(userId);
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

    if (Object.hasOwn(payload, "contentFormat")) {
      fieldsToUpdate.contentFormat = normalizeContentFormat(
        payload?.contentFormat,
      );
    }

    if (Object.hasOwn(payload, "color")) {
      const color = payload?.color?.trim();

      if (!color || !HEX_COLOR_REGEX.test(color)) {
        throw new AppError("color must be a valid hex code", 400);
      }

      fieldsToUpdate.color = color;
    }

    if (Object.hasOwn(payload, "labels")) {
      fieldsToUpdate.labels = normalizeLabels(payload?.labels);
    }

    if (Object.hasOwn(payload, "attachments")) {
      fieldsToUpdate.attachments = normalizeAttachments(payload?.attachments);
    }

    if (Object.hasOwn(payload, "links")) {
      fieldsToUpdate.links = normalizeLinks(payload?.links);
    }

    if (Object.hasOwn(payload, "reminderAt")) {
      fieldsToUpdate.reminderAt = normalizeReminderAt(payload?.reminderAt);
    }

    if (Object.hasOwn(payload, "order")) {
      fieldsToUpdate.order = Number(payload?.order || 0);
    }

    if (Object.hasOwn(payload, "aiSummary")) {
      fieldsToUpdate.aiSummary = String(payload?.aiSummary || "").trim();
    }

    if (Object.hasOwn(payload, "aiTitle")) {
      fieldsToUpdate.aiTitle = String(payload?.aiTitle || "").trim();
    }

    if (Object.hasOwn(payload, "smartTags")) {
      fieldsToUpdate.smartTags = normalizeLabels(payload?.smartTags);
    }

    if (Object.hasOwn(payload, "extractedTasks")) {
      if (!Array.isArray(payload?.extractedTasks)) {
        throw new AppError("extractedTasks must be an array", 400);
      }

      fieldsToUpdate.extractedTasks = payload.extractedTasks
        .map((task) => String(task).trim())
        .filter(Boolean);
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

      fieldsToUpdate.trashedAt = fieldsToUpdate.isTrashed ? new Date() : null;
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

  async duplicateUserNote(userId, noteId) {
    const note = await this.getUserNote(userId, noteId);
    return this.createNote(userId, {
      ...note,
      title: `${note.title} copy`,
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      reminderAt: null,
    });
  },

  async reorderUserNotes(userId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new AppError("orderedIds must be an array", 400);
    }

    await Promise.all(
      orderedIds.map((noteId, index) =>
        this.updateUserNote(userId, noteId, { order: index }),
      ),
    );

    return this.listUserNotes(userId, { sort: "order" });
  },
});

module.exports = {
  createNoteService,
};
