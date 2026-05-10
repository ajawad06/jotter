const asyncHandler = require("../utils/asyncHandler");
const logger = require("../config/logger");

const createAuthController = (authService) => ({
  signup: asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);

    logger.info({ userId: result.user.id }, "User signed up successfully");

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    logger.info({ userId: result.user.id }, "User logged in successfully");

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  }),
});

module.exports = {
  createAuthController,
};
