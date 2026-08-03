const express = require("express");
const request = require("supertest");
const { expect } = require("chai");

const { authLimiter } = require("../src/middlewares/rateLimiter");

describe("Rate limiter middleware", () => {
  it("blocks requests once the limit is exceeded", async () => {
    const app = express();
    app.post("/limited", authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 10; i += 1) {
      const response = await request(app).post("/limited");
      expect(response.status).to.equal(200);
    }

    const blockedResponse = await request(app).post("/limited");
    expect(blockedResponse.status).to.equal(429);
    expect(blockedResponse.body.message).to.match(/too many/i);
  });
});
