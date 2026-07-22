const express = require("express");

const { authenticate } = require("../middlewares/auth.middleware");
const { createNoteRepository } = require("../repositories/note.repository");
const { createNoteService } = require("../services/note.service");
const { createNoteController } = require("../controllers/note.controller");

const router = express.Router();

const noteRepository = createNoteRepository();
const noteService = createNoteService({ noteRepository });
const noteController = createNoteController(noteService);

router.use(authenticate);

router.post("/", noteController.createNote);
router.get("/", noteController.listUserNotes);
router.get("/:id", noteController.getUserNote);
router.put("/:id", noteController.updateUserNote);
router.delete("/:id", noteController.deleteUserNote);

module.exports = router;
