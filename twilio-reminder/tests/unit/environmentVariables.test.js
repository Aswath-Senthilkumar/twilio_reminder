// Test to check the environment variables

require("dotenv").config();

describe("Environment Variables", () => {
  it("should have TWILIO_ACCOUNT_SID defined", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
  });

  it("should have TWILIO_AUTH_TOKEN defined", () => {
    expect(process.env.TWILIO_AUTH_TOKEN).toBeDefined();
  });

  it("should have TWILIO_PHONE_NUMBER defined", () => {
    expect(process.env.TWILIO_PHONE_NUMBER).toBeDefined();
  });

  it("should have MONGODB_URI defined", () => {
    expect(process.env.MONGODB_URI).toBeDefined();
  });

  it("should have BASE_URL defined", () => {
    expect(process.env.BASE_URL).toBeDefined();
  });

  it("should have GOOGLE_APPLICATION_CREDENTIALS defined", () => {
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeDefined();
  });
});
