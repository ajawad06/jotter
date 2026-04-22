const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AppError = require("../utils/appError");

const createAuthService = ({ userRepository, jwtConfig }) => ({
  async signup({ name, email, password }) {
    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn },
    );

    return {
      user,
      token,
    };
  },

  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  },
});

module.exports = {
  createAuthService,
};
