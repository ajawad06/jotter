const asyncHandler = require("../utils/asyncHandler");
const logger = require("../config/logger");

const PERSIST_FIELD_BY_ACTION = {
  title: (result) => ({ aiTitle: result.title }),
  summary: (result) => ({ aiSummary: result.summary }),
  grammar: (result) => ({ content: result.corrected }),
  tags: (result) => ({ smartTags: result.tags }),
  tasks: (result) => ({ extractedTasks: result.tasks }),
};

const createAiController = ({ aiService, noteService }) => ({
  runAction: asyncHandler(async (req, res) => {
    const { id, action } = req.params;
    const note = await noteService.getUserNote(req.user.id, id);
    const result = await aiService.run(action, note, req.body || {});

    const buildUpdate = PERSIST_FIELD_BY_ACTION[action];
    const updatedNote = buildUpdate
      ? await noteService.updateUserNote(req.user.id, id, buildUpdate(result))
      : note;

    logger.info({ userId: req.user.id, noteId: id, action }, "AI action run");

    res.status(200).json({
      success: true,
      data: { ...result, note: updatedNote },
    });
  }),

  runDraftAction: asyncHandler(async (req, res) => {
    const { action } = req.params;
    const draft = {
      title: req.body?.title || "",
      content: req.body?.content || "",
    };
    const result = await aiService.run(action, draft, req.body || {});

    logger.info({ userId: req.user.id, action }, "AI draft action run");

    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  chat: asyncHandler(async (req, res) => {
    const notes = await noteService.listUserNotes(req.user.id);
    const result = await aiService.chat(notes, req.body?.message, {
      history: req.body?.history,
      createNote: (payload) => noteService.createNote(req.user.id, payload),
      updateNote: (noteId, payload) =>
        noteService.updateUserNote(req.user.id, noteId, payload),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }),
});

module.exports = {
  createAiController,
};
