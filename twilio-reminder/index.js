require("dotenv").config(); // Load the environment variables from .env

const express = require("express");
const twilio = require("twilio");

const app = express();
const port = process.env.PORT || 3000;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Base page route
app.get("/", (req, res) => {
  res.send("Twilio Reminder System is running.");
});

/**
 * End-point /api/call of method POST
 * This endpoint initiates an out-bound call with the help of Twilio API.
 */
app.post("/api/call", async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: "Phone number (to) is required." });
  }
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const call = await client.calls.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      url: `${BASE_URL}/voice`,
      statusCallback: `${BASE_URL}/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });
    console.log(`Call initiated with SID: ${call.sid}`);
    return res.json({
      message: "Call initiated successfully!",
      callSid: call.sid,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    return res.status(500).json({ error: "Failed to initiate call." });
  }
});

/**
 * End-point /voice of method POST
 * This endpoint is the TwiML instruction for the call that was initiated.
 */
app.post("/voice", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const answeredBy = req.body.AnsweredBy;

  twiml.say(
    "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /status of method POST
 * This endpoint receives status updates of the call throughout it's life cycle.
 */
app.post("/status", async (req, res) => {
  const { CallSid, CallStatus, From, To } = req.body;

  console.log(`Call SID: ${CallSid}`);
  console.log(`Call Status: ${CallStatus}`);
  console.log(`From: ${From}`);
  console.log(`To: ${To}`);

  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
