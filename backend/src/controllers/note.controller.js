const asyncHandler = require("../utils/asyncHandler");
const logger = require("../config/logger");

const createNoteController = (noteService) => ({
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
    const notes = await noteService.listUserNotes(req.user.id);

    res.status(200).json({
      success: true,
      data: notes,
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
});

module.exports = {
  createNoteController,
};
