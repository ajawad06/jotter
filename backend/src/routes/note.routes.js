const express = require("express");
const multer = require("multer");

const env = require("../config/env");
const { authenticate } = require("../middlewares/auth.middleware");
const { createNoteRepository } = require("../repositories/note.repository");
const { createUserRepository } = require("../repositories/user.repository");
const { createNoteService } = require("../services/note.service");
const { createNoteController } = require("../controllers/note.controller");
const { createUploadService } = require("../services/upload.service");
const { createAiService } = require("../services/ai.service");
const { createAiController } = require("../controllers/ai.controller");
const { aiLimiter } = require("../middlewares/rateLimiter");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const noteRepository = createNoteRepository();
const userRepository = createUserRepository();
const noteService = createNoteService({ noteRepository, userRepository });
const uploadService = createUploadService({ cloudinary });
const noteController = createNoteController(noteService, uploadService);
const aiService = createAiService({
  apiKey: env.groq.apiKey,
  model: env.groq.model,
});
const aiController = createAiController({ aiService, noteService });

router.use(authenticate);

/**
 * @openapi
 * /notes:
 *   post:
 *     summary: Create a note
 *     tags: [Notes]
 *     responses:
 *       201: { description: Note created }
 *   get:
 *     summary: List the authenticated user's notes
 *     tags: [Notes]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, archive, trash, reminders] }
 *       - in: query
 *         name: label
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [updated, created, title, order] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: skip
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of notes }
 */
router.post("/", noteController.createNote);
router.get("/", noteController.listUserNotes);

/**
 * @openapi
 * /notes/labels:
 *   get:
 *     summary: List the distinct labels across the user's notes
 *     tags: [Notes]
 *     responses:
 *       200: { description: List of label strings }
 */
router.get("/labels", noteController.listUserLabels);

/**
 * @openapi
 * /notes/labels:
 *   post:
 *     summary: Create a new label, independent of any note
 *     tags: [Notes]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Updated list of labels }
 */
router.post("/labels", noteController.createLabel);

/**
 * @openapi
 * /notes/labels/{label}:
 *   patch:
 *     summary: Rename a label everywhere it's used
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: label
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newName]
 *             properties:
 *               newName: { type: string }
 *     responses:
 *       200: { description: Updated list of labels }
 */
router.patch("/labels/:label", noteController.renameLabel);

/**
 * @openapi
 * /notes/reorder:
 *   post:
 *     summary: Persist a manual drag-and-drop note order
 *     tags: [Notes]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Notes in their new order }
 */
router.post("/reorder", noteController.reorderUserNotes);

/**
 * @openapi
 * /notes/{id}/duplicate:
 *   post:
 *     summary: Duplicate a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: The duplicated note }
 */
router.post("/:id/duplicate", noteController.duplicateUserNote);

/**
 * @openapi
 * /notes/{id}/attachments:
 *   post:
 *     summary: Upload a file/image attachment to a note (Cloudinary-backed)
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Updated note with the new attachment }
 */
router.post(
  "/:id/attachments",
  upload.single("file"),
  noteController.addAttachment,
);

/**
 * @openapi
 * /notes/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove an attachment from a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated note without the attachment }
 *       404: { description: Attachment not found }
 */
router.delete(
  "/:id/attachments/:attachmentId",
  noteController.removeAttachment,
);

/**
 * @openapi
 * /notes/{id}/ai/{action}:
 *   post:
 *     summary: Run an AI action on a note (title, summary, grammar, tags, tasks, translate)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [title, summary, grammar, tags, tasks, translate]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetLanguage:
 *                 type: string
 *                 description: Used only by the translate action
 *     responses:
 *       200: { description: AI action result and the updated note }
 *       429: { description: Too many AI requests }
 */
router.post("/:id/ai/:action", aiLimiter, aiController.runAction);

/**
 * @openapi
 * /notes/{id}:
 *   get:
 *     summary: Get a single note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The note }
 *       404: { description: Note not found }
 *   put:
 *     summary: Update a note (also used for pin/archive/trash/reminder/label toggles)
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The updated note }
 *   delete:
 *     summary: Permanently delete a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Note deleted }
 */
router.get("/:id", noteController.getUserNote);
router.put("/:id", noteController.updateUserNote);
router.delete("/:id", noteController.deleteUserNote);

module.exports = router;
