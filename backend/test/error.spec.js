const request = require("supertest");
const { expect } = require("chai");
const express = require("express");
const AppError = require("../src/utils/appError");
const errorHandler = require("../src/middlewares/errorHandler");
const notFound = require("../src/middlewares/notFound");

describe("Global Error Handling", () => {
  let app;

  before(() => {
    app = express();
    app.use(express.json());

    // Test routes
    app.get("/error-400", (req, res, next) => {
      next(new AppError("Bad Request", 400));
    });

    app.get("/error-500", (req, res, next) => {
      next(new Error("Something went wrong"));
    });

    app.get("/operational-error", (req, res, next) => {
      const err = new Error("Operational issue");
      err.statusCode = 403;
      err.isOperational = true;
      next(err);
    });

    app.use(notFound);
    app.use(errorHandler);
  });

  it("should handle 404 for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("success", false);
    expect(res.body).to.have.property("message").that.includes("not found");
  });

  it("should handle custom AppError (400)", async () => {
    const res = await request(app).get("/error-400");
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("success", false);
    expect(res.body).to.have.property("message", "Bad Request");
  });

  it("should handle unexpected Error (500)", async () => {
    const res = await request(app).get("/error-500");
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property("success", false);
    expect(res.body).to.have.property("message", "Internal server error");
  });

  it("should handle operational errors with custom status code", async () => {
    const res = await request(app).get("/operational-error");
    expect(res.status).to.equal(403);
    expect(res.body).to.have.property("success", false);
    expect(res.body).to.have.property("message", "Operational issue");
  });
});
