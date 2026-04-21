const request = require("supertest");
const { expect } = require("chai");

const app = require("../src/app");

describe("Health route", () => {
  it("returns API health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
  });
});
