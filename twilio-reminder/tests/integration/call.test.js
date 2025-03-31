// Test to check the integration of the outgoing call API

const request = require("supertest");
require("dotenv").config();

describe("POST /api/call integration", () => {
  it("should return 400 if 'to' is missing", async () => {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .post("/api/call")
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Phone number (to) is required.");
  });

  it("should initiate an outbound call if 'to' is provided", async () => {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .post("/api/call")
      .send({ to: process.env.MY_PHONE_NUMBER });
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.message).toBe("Call initiated successfully!");
      expect(response.body.callSid).toBeDefined();
    } else {
      expect(response.body.error).toBe("Failed to initiate call.");
    }
  });
});
