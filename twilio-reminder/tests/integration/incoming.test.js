// Test to check the integration of the incoming call API

const request = require("supertest");
require("dotenv").config();

describe("ALL /incoming integration", () => {
  it("should handle incoming calls and return TwiML with streaming instructions", async () => {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .post("/incoming")
      .send({
        CallSid: "CAIncomingTest",
        From: process.env.MY_PHONE_NUMBER,
        To: process.env.TWILIO_PHONE_NUMBER,
      })
      .expect(200);

    expect(response.text).toMatch(/<Start>/);
    expect(response.text).toMatch(/confirm your medications for the day/);
  });

  it("should handle missing callSid or from/to", async () => {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .post("/incoming")
      .send({})
      .expect(200);

    expect(response.text).toMatch(/<Start>/);
  });
});
