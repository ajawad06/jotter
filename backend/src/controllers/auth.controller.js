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

  getProfile: asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  }),

  logout: asyncHandler(async (req, res) => {
    logger.info({ userId: req.user.id }, "User logged out");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body?.token);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  resendVerification: asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.user.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body?.email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(
      req.body?.token,
      req.body?.password,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const result = await authService.deleteAccount(req.user.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }),
});

module.exports = {
  createAuthController,
};
