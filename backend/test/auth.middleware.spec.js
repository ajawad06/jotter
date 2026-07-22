const { expect } = require("chai");
const jwt = require("jsonwebtoken");
const { authenticate } = require("../src/middlewares/auth.middleware");
const env = require("../src/config/env");

describe("Auth Middleware", () => {
  it("passes to next() when token is valid", () => {
    const token = jwt.sign(
      { sub: "user-123", email: "test@example.com" },
      env.jwt.secret,
    );
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = {};
    let nextCalled = false;
    let nextError = null;

    authenticate(req, res, (err) => {
      nextCalled = true;
      nextError = err;
    });

    expect(nextCalled).to.equal(true);
    expect(nextError).to.be.undefined;
    expect(req.user.id).to.equal("user-123");
    expect(req.user.email).to.equal("test@example.com");
  });

  it("returns 401 when authorization header is missing", () => {
    const req = { headers: {} };
    const res = {};
    let nextError = null;

    authenticate(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).to.not.be.null;
    expect(nextError.statusCode).to.equal(401);
    expect(nextError.message).to.equal("Authorization token is missing");
  });

  it("returns 401 when token is invalid", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    };
    const res = {};
    let nextError = null;

    authenticate(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).to.not.be.null;
    expect(nextError.statusCode).to.equal(401);
    expect(nextError.message).to.equal("Invalid or expired token");
  });
});
