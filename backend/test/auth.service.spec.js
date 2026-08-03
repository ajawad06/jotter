const { expect } = require("chai");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { createAuthService } = require("../src/services/auth.service");
const AppError = require("../src/utils/appError");

describe("Auth service", () => {
  const jwtConfig = {
    secret: "test_secret",
    expiresIn: "1h",
  };

  it("signs up a new user", async () => {
    let capturedToken;
    const fakeRepository = {
      findByEmail: async () => null,
      createUser: async ({ name, email }) => ({ id: 1, name, email }),
      setEmailVerificationToken: async () => {},
    };
    const fakeEmailService = {
      sendVerificationEmail: async (user, token) => {
        capturedToken = token;
      },
    };

    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
      emailService: fakeEmailService,
    });

    const result = await authService.signup({
      name: "Abdullah",
      email: "abdullah@example.com",
      password: "password123",
    });

    expect(result.user.email).to.equal("abdullah@example.com");
    expect(result.user.isEmailVerified).to.equal(false);
    expect(result.token).to.be.a("string");
    expect(capturedToken).to.be.a("string");

    const payload = jwt.verify(result.token, jwtConfig.secret);
    expect(payload.email).to.equal("abdullah@example.com");
  });

  it("prevents signup with duplicate email", async () => {
    const fakeRepository = {
      findByEmail: async () => ({ id: 1, email: "exists@example.com" }),
      createUser: async () => {
        throw new Error("should not create");
      },
    };

    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    try {
      await authService.signup({
        name: "User",
        email: "exists@example.com",
        password: "password123",
      });
      throw new Error("Expected signup to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(409);
    }
  });

  it("rejects signup when required fields are missing", async () => {
    const authService = createAuthService({
      userRepository: {},
      jwtConfig,
    });

    try {
      await authService.signup({
        name: "",
        email: "abdullah@example.com",
        password: "password123",
      });
      throw new Error("Expected signup to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("logs in a user with valid credentials", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    const fakeRepository = {
      findByEmail: async () => ({
        id: 1,
        name: "Abdullah",
        email: "abdullah@example.com",
        passwordHash,
        profileImage: "",
        profileColor: "#1a73e8",
      }),
    };

    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    const result = await authService.login({
      email: "  Abdullah@Example.com ",
      password: "password123",
    });

    expect(result.user.email).to.equal("abdullah@example.com");
    expect(result.token).to.be.a("string");
  });

  it("rejects login when required fields are missing", async () => {
    const authService = createAuthService({
      userRepository: {},
      jwtConfig,
    });

    try {
      await authService.login({ email: "", password: "" });
      throw new Error("Expected login to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("rejects login when the user does not exist", async () => {
    const fakeRepository = {
      findByEmail: async () => null,
    };
    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    try {
      await authService.login({
        email: "missing@example.com",
        password: "password123",
      });
      throw new Error("Expected login to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(401);
    }
  });

  it("rejects login with wrong password", async () => {
    const fakeRepository = {
      findByEmail: async () => ({
        id: 1,
        name: "Abdullah",
        email: "abdullah@example.com",
        passwordHash:
          "$2a$10$0zAA2PU9nHLfQ4MQYT8nKuS8sPV8fV7h4N3H8yl5fk26vPbSU0exG",
      }),
    };

    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    try {
      await authService.login({
        email: "abdullah@example.com",
        password: "wrong-password",
      });
      throw new Error("Expected login to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(401);
    }
  });

  it("returns and updates profile details", async () => {
    const fakeRepository = {
      findById: async (userId) => ({ id: userId, name: "Abdullah" }),
      updateUser: async (userId, updateData) => ({ id: userId, ...updateData }),
    };
    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    const profile = await authService.getProfile(1);
    const updatedProfile = await authService.updateProfile(1, { name: "New" });

    expect(profile).to.deep.equal({ id: 1, name: "Abdullah" });
    expect(updatedProfile).to.deep.equal({ id: 1, name: "New" });
  });

  it("rejects profile operations for missing users", async () => {
    const fakeRepository = {
      findById: async () => null,
      updateUser: async () => null,
    };
    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    try {
      await authService.getProfile(404);
      throw new Error("Expected getProfile to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }

    try {
      await authService.updateProfile(404, { name: "Missing" });
      throw new Error("Expected updateProfile to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }
  });

  it("verifies an email with a valid token", async () => {
    let markedUserId;
    const fakeRepository = {
      findByEmailVerificationTokenHash: async () => ({
        id: "1",
        isEmailVerified: false,
        emailVerificationExpires: new Date(Date.now() + 60000),
      }),
      markEmailVerified: async (userId) => {
        markedUserId = userId;
      },
    };
    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    const result = await authService.verifyEmail("raw-token");

    expect(markedUserId).to.equal("1");
    expect(result.message).to.match(/verified/i);
  });

  it("rejects verification with an expired or unknown token", async () => {
    const authService = createAuthService({
      userRepository: {
        findByEmailVerificationTokenHash: async () => null,
      },
      jwtConfig,
    });

    try {
      await authService.verifyEmail("bad-token");
      throw new Error("Expected verifyEmail to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("resends verification only for unverified users", async () => {
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({ id: "1", isEmailVerified: true }),
      },
      jwtConfig,
    });

    try {
      await authService.resendVerification("1");
      throw new Error("Expected resendVerification to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("always responds successfully to forgotPassword to avoid user enumeration", async () => {
    const authService = createAuthService({
      userRepository: {
        findByEmail: async () => null,
      },
      jwtConfig,
    });

    const result = await authService.forgotPassword("missing@example.com");
    expect(result.message).to.match(/reset link/i);
  });

  it("sends a reset email when the account exists", async () => {
    let sentToken;
    const authService = createAuthService({
      userRepository: {
        findByEmail: async () => ({ id: "1", email: "abdullah@example.com" }),
        setPasswordResetToken: async () => {},
      },
      jwtConfig,
      emailService: {
        sendPasswordResetEmail: async (_user, token) => {
          sentToken = token;
        },
      },
    });

    await authService.forgotPassword("abdullah@example.com");
    expect(sentToken).to.be.a("string");
  });

  it("resets the password with a valid token", async () => {
    let capturedHash;
    const authService = createAuthService({
      userRepository: {
        findByPasswordResetTokenHash: async () => ({
          id: "1",
          passwordResetExpires: new Date(Date.now() + 60000),
        }),
        resetPassword: async (_userId, passwordHash) => {
          capturedHash = passwordHash;
        },
      },
      jwtConfig,
    });

    const result = await authService.resetPassword("raw-token", "newPassword1");

    expect(capturedHash).to.be.a("string");
    expect(result.message).to.match(/reset/i);
  });

  it("rejects password reset with an expired or unknown token", async () => {
    const authService = createAuthService({
      userRepository: {
        findByPasswordResetTokenHash: async () => null,
      },
      jwtConfig,
    });

    try {
      await authService.resetPassword("bad-token", "newPassword1");
      throw new Error("Expected resetPassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("rejects password reset when fields are missing", async () => {
    const authService = createAuthService({ userRepository: {}, jwtConfig });

    try {
      await authService.resetPassword("", "");
      throw new Error("Expected resetPassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("returns the email-already-verified message without re-marking", async () => {
    let markCalled = false;
    const authService = createAuthService({
      userRepository: {
        findByEmailVerificationTokenHash: async () => ({
          id: "1",
          isEmailVerified: true,
          emailVerificationExpires: new Date(Date.now() + 60000),
        }),
        markEmailVerified: async () => {
          markCalled = true;
        },
      },
      jwtConfig,
    });

    const result = await authService.verifyEmail("raw-token");
    expect(markCalled).to.equal(false);
    expect(result.message).to.match(/already verified/i);
  });

  it("resends a verification email for an unverified user", async () => {
    let sentToken;
    let storedExpiry;
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({
          id: "1",
          email: "a@example.com",
          isEmailVerified: false,
        }),
        setEmailVerificationToken: async (_id, _hash, expires) => {
          storedExpiry = expires;
        },
      },
      jwtConfig,
      emailService: {
        sendVerificationEmail: async (_user, token) => {
          sentToken = token;
        },
      },
    });

    const result = await authService.resendVerification("1");
    expect(sentToken).to.be.a("string");
    expect(storedExpiry).to.be.instanceOf(Date);
    expect(result.message).to.match(/sent/i);
  });

  it("still succeeds resending verification when the email send fails", async () => {
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({
          id: "1",
          email: "a@example.com",
          isEmailVerified: false,
        }),
        setEmailVerificationToken: async () => {},
      },
      jwtConfig,
      emailService: {
        sendVerificationEmail: async () => {
          throw new Error("smtp down");
        },
      },
    });

    const result = await authService.resendVerification("1");
    expect(result.message).to.match(/sent/i);
  });

  it("rejects resending verification for a missing user", async () => {
    const authService = createAuthService({
      userRepository: { findById: async () => null },
      jwtConfig,
    });

    try {
      await authService.resendVerification("404");
      throw new Error("Expected resendVerification to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }
  });

  it("rejects forgotPassword when no email is provided", async () => {
    const authService = createAuthService({ userRepository: {}, jwtConfig });

    try {
      await authService.forgotPassword("");
      throw new Error("Expected forgotPassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("still succeeds forgotPassword when the reset email fails to send", async () => {
    const authService = createAuthService({
      userRepository: {
        findByEmail: async () => ({ id: "1", email: "a@example.com" }),
        setPasswordResetToken: async () => {},
      },
      jwtConfig,
      emailService: {
        sendPasswordResetEmail: async () => {
          throw new Error("smtp down");
        },
      },
    });

    const result = await authService.forgotPassword("a@example.com");
    expect(result.message).to.match(/reset link/i);
  });

  it("changes a password with the correct current password", async () => {
    const currentHash = await bcrypt.hash("oldPassword1", 10);
    let storedHash;
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({ id: "1", passwordHash: currentHash }),
        updatePassword: async (_id, passwordHash) => {
          storedHash = passwordHash;
        },
      },
      jwtConfig,
    });

    const result = await authService.changePassword("1", {
      currentPassword: "oldPassword1",
      newPassword: "newPassword1",
    });

    expect(storedHash).to.be.a("string");
    expect(await bcrypt.compare("newPassword1", storedHash)).to.equal(true);
    expect(result.message).to.match(/changed/i);
  });

  it("rejects changePassword when fields are missing", async () => {
    const authService = createAuthService({ userRepository: {}, jwtConfig });

    try {
      await authService.changePassword("1", {});
      throw new Error("Expected changePassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("rejects changePassword when the new password is too short", async () => {
    const authService = createAuthService({ userRepository: {}, jwtConfig });

    try {
      await authService.changePassword("1", {
        currentPassword: "oldPassword1",
        newPassword: "123",
      });
      throw new Error("Expected changePassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("rejects changePassword for a missing user", async () => {
    const authService = createAuthService({
      userRepository: { findById: async () => null },
      jwtConfig,
    });

    try {
      await authService.changePassword("404", {
        currentPassword: "oldPassword1",
        newPassword: "newPassword1",
      });
      throw new Error("Expected changePassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }
  });

  it("rejects changePassword when the current password is wrong", async () => {
    const currentHash = await bcrypt.hash("oldPassword1", 10);
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({ id: "1", passwordHash: currentHash }),
      },
      jwtConfig,
    });

    try {
      await authService.changePassword("1", {
        currentPassword: "wrongPassword",
        newPassword: "newPassword1",
      });
      throw new Error("Expected changePassword to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(401);
    }
  });

  it("deletes an account and its notes", async () => {
    let deletedNotesFor;
    let deletedUserId;
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({ id: "1" }),
        deleteUser: async (userId) => {
          deletedUserId = userId;
        },
      },
      noteRepository: {
        deleteAllByUserId: async (userId) => {
          deletedNotesFor = userId;
        },
      },
      jwtConfig,
    });

    const result = await authService.deleteAccount("1");
    expect(deletedNotesFor).to.equal("1");
    expect(deletedUserId).to.equal("1");
    expect(result.message).to.match(/deleted/i);
  });

  it("deletes an account even without a note repository", async () => {
    let deletedUserId;
    const authService = createAuthService({
      userRepository: {
        findById: async () => ({ id: "1" }),
        deleteUser: async (userId) => {
          deletedUserId = userId;
        },
      },
      jwtConfig,
    });

    const result = await authService.deleteAccount("1");
    expect(deletedUserId).to.equal("1");
    expect(result.message).to.match(/deleted/i);
  });

  it("rejects deleting a missing account", async () => {
    const authService = createAuthService({
      userRepository: { findById: async () => null },
      jwtConfig,
    });

    try {
      await authService.deleteAccount("404");
      throw new Error("Expected deleteAccount to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }
  });
});
