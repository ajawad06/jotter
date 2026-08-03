const express = require("express");

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check API health
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Notes API is healthy",
  });
});

module.exports = router;
