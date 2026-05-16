const express = require("express");

const env = require("../config/env");
const { createUserRepository } = require("../repositories/user.repository");
const { createAuthService } = require("../services/auth.service");
const { createAuthController } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

const userRepository = createUserRepository();
const authService = createAuthService({
  userRepository,
  jwtConfig: env.jwt,
});
const authController = createAuthController(authService);

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/profile", authenticate, authController.getProfile);
router.patch("/profile", authenticate, authController.updateProfile);

module.exports = router;
