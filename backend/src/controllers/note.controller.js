const crypto = require("crypto");

const asyncHandler = require("../utils/asyncHandler");
const logger = require("../config/logger");
const AppError = require("../utils/appError");

const createNoteController = (noteService, uploadService) => ({
  createNote: asyncHandler(async (req, res) => {
    const note = await noteService.createNote(req.user.id, req.body);

    logger.info({ userId: req.user.id, noteId: note.id }, "Note created");

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  }),

  listUserNotes: asyncHandler(async (req, res) => {
    const { status, label, search, sort, limit, skip } = req.query || {};
    const notes = await noteService.listUserNotes(req.user.id, {
      status,
      label,
      search,
      sort,
      limit,
      skip,
    });

    res.status(200).json({
      success: true,
      data: notes,
    });
  }),

  listUserLabels: asyncHandler(async (req, res) => {
    const labels = await noteService.listUserLabels(req.user.id);

    res.status(200).json({
      success: true,
      data: labels,
    });
  }),

  createLabel: asyncHandler(async (req, res) => {
    const labels = await noteService.createLabel(req.user.id, req.body?.name);

    res.status(201).json({
      success: true,
      data: labels,
    });
  }),

  renameLabel: asyncHandler(async (req, res) => {
    const labels = await noteService.renameLabel(
      req.user.id,
      decodeURIComponent(req.params.label),
      req.body?.newName,
    );

    res.status(200).json({
      success: true,
      data: labels,
    });
  }),

  getUserNote: asyncHandler(async (req, res) => {
    const note = await noteService.getUserNote(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      data: note,
    });
  }),

  updateUserNote: asyncHandler(async (req, res) => {
    const note = await noteService.updateUserNote(
      req.user.id,
      req.params.id,
      req.body,
    );

    logger.info({ userId: req.user.id, noteId: note.id }, "Note updated");

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  }),

  deleteUserNote: asyncHandler(async (req, res) => {
    await noteService.deleteUserNote(req.user.id, req.params.id);

    logger.info({ userId: req.user.id, noteId: req.params.id }, "Note deleted");

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  }),

  duplicateUserNote: asyncHandler(async (req, res) => {
    const note = await noteService.duplicateUserNote(req.user.id, req.params.id);

    logger.info(
      { userId: req.user.id, noteId: note.id },
      "Note duplicated",
    );

    res.status(201).json({
      success: true,
      message: "Note duplicated successfully",
      data: note,
    });
  }),

  reorderUserNotes: asyncHandler(async (req, res) => {
    const notes = await noteService.reorderUserNotes(
      req.user.id,
      req.body?.orderedIds,
    );

    res.status(200).json({
      success: true,
      data: notes,
    });
  }),

  addAttachment: asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError("A file is required", 400);
    }

    const note = await noteService.getUserNote(req.user.id, req.params.id);
    const uploaded = await uploadService.uploadBuffer(req.file.buffer, {
      folder: `jotter/${req.user.id}`,
      filename: req.file.originalname,
    });

    const attachment = {
      id: crypto.randomUUID(),
      name: req.file.originalname,
      url: uploaded.url,
      type: req.file.mimetype,
      size: req.file.size,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
    };

    const updatedNote = await noteService.updateUserNote(
      req.user.id,
      req.params.id,
      { attachments: [...(note.attachments || []), attachment] },
    );

    logger.info(
      { userId: req.user.id, noteId: note.id, attachmentId: attachment.id },
      "Attachment added",
    );

    res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: updatedNote,
    });
  }),

  removeAttachment: asyncHandler(async (req, res) => {
    const note = await noteService.getUserNote(req.user.id, req.params.id);
    const attachment = (note.attachments || []).find(
      (item) => item.id === req.params.attachmentId,
    );

    if (!attachment) {
      throw new AppError("Attachment not found", 404);
    }

    await uploadService.deleteByPublicId(
      attachment.publicId,
      attachment.resourceType,
    );

    const updatedNote = await noteService.updateUserNote(
      req.user.id,
      req.params.id,
      {
        attachments: (note.attachments || []).filter(
          (item) => item.id !== req.params.attachmentId,
        ),
      },
    );

    logger.info(
      { userId: req.user.id, noteId: note.id, attachmentId: attachment.id },
      "Attachment removed",
    );

    res.status(200).json({
      success: true,
      message: "Attachment removed successfully",
      data: updatedNote,
    });
  }),
});

module.exports = {
  createNoteController,
};
