const { expect } = require("chai");
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
});
