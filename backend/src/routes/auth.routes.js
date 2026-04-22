const express = require("express");

const env = require("../config/env");
const { createUserRepository } = require("../repositories/user.repository");
const { createAuthService } = require("../services/auth.service");
const { createAuthController } = require("../controllers/auth.controller");

const router = express.Router();

const userRepository = createUserRepository();
const authService = createAuthService({
  userRepository,
  jwtConfig: env.jwt,
});
const authController = createAuthController(authService);

router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;
