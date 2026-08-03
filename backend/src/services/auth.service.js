const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AppError = require("../utils/appError");
const { generateToken, hashToken } = require("../utils/token");
const logger = require("../config/logger");

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const createAuthService = ({
  userRepository,
  noteRepository,
  jwtConfig,
  emailService,
}) => ({
  async signup({ name, email, password }) {
    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const JOTTER_PROFILE_COLORS = [
      "#1a73e8",
      "#d93025",
      "#f9ab00",
      "#188038",
      "#af5cf7",
      "#00acc1",
      "#ff6d00",
    ];
    const profileColor =
      JOTTER_PROFILE_COLORS[
        Math.floor(Math.random() * JOTTER_PROFILE_COLORS.length)
      ];

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      profileColor,
    });

    const verificationToken = generateToken();
    await userRepository.setEmailVerificationToken(
      user.id,
      hashToken(verificationToken),
      new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    );

    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (error) {
      logger.warn(
        { userId: user.id, err: error.message },
        "Failed to send verification email",
      );
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
        profileImage: user.profileImage,
        profileColor: user.profileColor,
        isEmailVerified: false,
      },
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
        profileImage: user.profileImage,
        profileColor: user.profileColor,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    };
  },

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  },

  async updateProfile(userId, updateData) {
    const user = await userRepository.updateUser(userId, updateData);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  },

  async verifyEmail(token) {
    if (!token) {
      throw new AppError("Verification token is required", 400);
    }

    const record = await userRepository.findByEmailVerificationTokenHash(
      hashToken(token),
    );

    if (
      !record ||
      !record.emailVerificationExpires ||
      record.emailVerificationExpires < new Date()
    ) {
      throw new AppError("Verification link is invalid or has expired", 400);
    }

    if (record.isEmailVerified) {
      return { message: "Email is already verified" };
    }

    await userRepository.markEmailVerified(record.id);

    return { message: "Email verified successfully" };
  },

  async resendVerification(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.isEmailVerified) {
      throw new AppError("Email is already verified", 400);
    }

    const verificationToken = generateToken();
    await userRepository.setEmailVerificationToken(
      user.id,
      hashToken(verificationToken),
      new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    );

    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (error) {
      logger.warn(
        { userId: user.id, err: error.message },
        "Failed to send verification email",
      );
    }

    return { message: "Verification email sent" };
  },

  async forgotPassword(email) {
    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (user) {
      const resetToken = generateToken();
      await userRepository.setPasswordResetToken(
        user.id,
        hashToken(resetToken),
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );

      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
      } catch (error) {
        logger.warn(
          { userId: user.id, err: error.message },
          "Failed to send password reset email",
        );
      }
    }

    return {
      message:
        "If an account exists for that email, a reset link has been sent",
    };
  },

  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new AppError("Token and new password are required", 400);
    }

    const record = await userRepository.findByPasswordResetTokenHash(
      hashToken(token),
    );

    if (
      !record ||
      !record.passwordResetExpires ||
      record.passwordResetExpires < new Date()
    ) {
      throw new AppError("Reset link is invalid or has expired", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.resetPassword(record.id, passwordHash);

    return { message: "Password has been reset successfully" };
  },

  async changePassword(userId, { currentPassword, newPassword } = {}) {
    if (!currentPassword || !newPassword) {
      throw new AppError("Current and new passwords are required", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters", 400);
    }

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, passwordHash);

    return { message: "Password changed successfully" };
  },

  async deleteAccount(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (noteRepository) {
      await noteRepository.deleteAllByUserId(userId);
    }

    await userRepository.deleteUser(userId);

    return { message: "Account deleted successfully" };
  },
});

module.exports = {
  createAuthService,
};
