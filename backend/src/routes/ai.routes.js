const express = require("express");

const env = require("../config/env");
const { authenticate } = require("../middlewares/auth.middleware");
const { aiLimiter } = require("../middlewares/rateLimiter");
const { createNoteRepository } = require("../repositories/note.repository");
const { createNoteService } = require("../services/note.service");
const { createAiService } = require("../services/ai.service");
const { createAiController } = require("../controllers/ai.controller");

const router = express.Router();

const noteRepository = createNoteRepository();
const noteService = createNoteService({ noteRepository });
const aiService = createAiService({
  apiKey: env.groq.apiKey,
  model: env.groq.model,
});
const aiController = createAiController({ aiService, noteService });

router.use(authenticate);

/**
 * @openapi
 * /ai/chat:
 *   post:
 *     summary: Ask a question answered using the user's own notes (RAG-style)
 *     tags: [AI]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: The AI-generated answer }
 *       429: { description: Too many AI requests }
 */
router.post("/chat", aiLimiter, aiController.chat);

/**
 * @openapi
 * /ai/draft/{action}:
 *   post:
 *     summary: Run an AI action on unsaved draft content (title/grammar/tags/etc.)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: action
 *         required: true
 *         schema: { type: string, enum: [title, summary, grammar, tags, tasks, translate] }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: The AI result (not persisted) }
 *       429: { description: Too many AI requests }
 */
router.post("/draft/:action", aiLimiter, aiController.runDraftAction);

module.exports = router;
