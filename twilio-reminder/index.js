require("dotenv").config();

const express = require("express");
const twilio = require("twilio");
const app = express();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(express.json());

app.post("/api/call", async (req, res) => {
  try {
    const call = await twilioClient.calls.create({
      to: process.env.MY_PHONE_NUMBER,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: "http://demo.twilio.com/docs/voice.xml",
    });
    return res.json({
      message: "Call initiated successfully!",
      callSid: call.sid,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return res.status(500).json({ error: "Failed to initiate call" });
  }
});

app.listen(process.env.PORT);
