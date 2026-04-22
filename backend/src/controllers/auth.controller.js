const asyncHandler = require("../utils/asyncHandler");

const createAuthController = (authService) => ({
  signup: asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

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
