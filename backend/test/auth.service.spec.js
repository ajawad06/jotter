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
    const fakeRepository = {
      findByEmail: async () => null,
      createUser: async ({ name, email }) => ({ id: 1, name, email }),
    };

    const authService = createAuthService({
      userRepository: fakeRepository,
      jwtConfig,
    });

    const result = await authService.signup({
      name: "Abdullah",
      email: "abdullah@example.com",
      password: "password123",
    });

    expect(result.user.email).to.equal("abdullah@example.com");
    expect(result.token).to.be.a("string");

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
});
