// Test to check the integration of the call logs API

const request = require("supertest");
require("dotenv").config();

describe("GET /call-logs integration", () => {
  it("should retrieve call logs as an array", async () => {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .get("/call-logs")
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
