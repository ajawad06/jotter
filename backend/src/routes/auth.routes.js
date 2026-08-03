const express = require("express");

const env = require("../config/env");
const { createUserRepository } = require("../repositories/user.repository");
const { createNoteRepository } = require("../repositories/note.repository");
const { createAuthService } = require("../services/auth.service");
const { createAuthController } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimiter");
const emailService = require("../config/email");

const router = express.Router();

const userRepository = createUserRepository();
const noteRepository = createNoteRepository();
const authService = createAuthService({
  userRepository,
  noteRepository,
  jwtConfig: env.jwt,
  emailService,
});
const authController = createAuthController(authService);

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       201: { description: User created, JWT token returned }
 *       409: { description: Email already registered }
 */
router.post("/signup", authLimiter, authController.signup);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login successful, JWT token returned }
 *       401: { description: Invalid email or password }
 */
router.post("/login", authLimiter, authController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out the current session
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     responses:
 *       200: { description: User profile }
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               profileImage: { type: string }
 *               profileColor: { type: string }
 *     responses:
 *       200: { description: Updated user profile }
 */
router.get("/me", authenticate, authController.getProfile);
router.patch("/me", authenticate, authController.updateProfile);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change the authenticated user's password
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Current password is incorrect }
 */
router.post("/change-password", authenticate, authController.changePassword);

/**
 * @openapi
 * /auth/me:
 *   delete:
 *     summary: Permanently delete the authenticated user's account and notes
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Account deleted }
 */
router.delete("/me", authenticate, authController.deleteAccount);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify an email address using a emailed token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
router.post("/verify-email", authController.verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Resend the email verification link
 *     tags: [Auth]
 *     responses:
 *       200: { description: Verification email sent }
 *       400: { description: Email is already verified }
 */
router.post(
  "/resend-verification",
  authenticate,
  authController.resendVerification,
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset email sent if the account exists }
 */
router.post("/forgot-password", authLimiter, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset a password using a emailed token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
router.post("/reset-password", authLimiter, authController.resetPassword);

module.exports = router;
