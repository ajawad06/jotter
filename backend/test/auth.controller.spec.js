const { expect } = require("chai");

const { createAuthController } = require("../src/controllers/auth.controller");

describe("Auth controller", () => {
  it("returns 201 for successful signup", async () => {
    const fakeService = {
      signup: async () => ({
        user: { id: 1, name: "Abdullah", email: "abdullah@example.com" },
        token: "token-value",
      }),
    };

    const controller = createAuthController(fakeService);

    const req = {
      body: {
        name: "Abdullah",
        email: "abdullah@example.com",
        password: "password123",
      },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.signup(req, res, () => {});

    expect(statusCode).to.equal(201);
    expect(payload.success).to.equal(true);
    expect(payload.data.user.email).to.equal("abdullah@example.com");
  });

  it("returns 200 for successful login", async () => {
    const fakeService = {
      login: async () => ({
        user: { id: 1, name: "Abdullah", email: "abdullah@example.com" },
        token: "token-value",
      }),
    };

    const controller = createAuthController(fakeService);

    const req = {
      body: {
        email: "abdullah@example.com",
        password: "password123",
      },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.login(req, res, () => {});

    expect(statusCode).to.equal(200);
    expect(payload.success).to.equal(true);
    expect(payload.data.token).to.equal("token-value");
  });

  it("returns 200 for getting profile", async () => {
    const fakeService = {
      getProfile: async () => ({
        id: 1,
        name: "Abdullah",
        email: "abdullah@example.com",
      }),
    };

    const controller = createAuthController(fakeService);

    const req = {
      user: { id: 1 },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.getProfile(req, res, () => {});

    expect(statusCode).to.equal(200);
    expect(payload.success).to.equal(true);
    expect(payload.data.name).to.equal("Abdullah");
  });

  it("returns 200 for successful profile update", async () => {
    const fakeService = {
      updateProfile: async () => ({
        id: 1,
        name: "Abdullah Updated",
        email: "abdullah@example.com",
      }),
    };

    const controller = createAuthController(fakeService);

    const req = {
      user: { id: 1 },
      body: { name: "Abdullah Updated" },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.updateProfile(req, res, () => {});

    expect(statusCode).to.equal(200);
    expect(payload.success).to.equal(true);
    expect(payload.data.name).to.equal("Abdullah Updated");
  });

  it("returns 200 for successful logout", async () => {
    const controller = createAuthController({});

    const req = {
      user: { id: 1 },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.logout(req, res, () => {});

    expect(statusCode).to.equal(200);
    expect(payload.success).to.equal(true);
    expect(payload.message).to.equal("Logged out successfully");
  });

  it("passes service errors to next middleware", async () => {
    const expectedError = new Error("service failed");
    const fakeService = {
      login: async () => {
        throw expectedError;
      },
    };

    const controller = createAuthController(fakeService);

    const req = {
      body: {
        email: "test@example.com",
        password: "bad-pass",
      },
    };

    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };

    let passedError;
    const next = (error) => {
      passedError = error;
    };

    await controller.login(req, res, next);

    expect(passedError).to.equal(expectedError);
  });
});
