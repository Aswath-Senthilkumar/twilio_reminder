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
 * It requires a phone number (to) in the request body.
 * TwiML instructions for the call are fetched from the /voice endpoint.
 * Machine detection is used to determine if the call was answered by a human or a machine.
 * The status of the call is tracked using status callbacks to the /status endpoint.
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
      machineDetection: "DetectMessageEnd",
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
 * End-point /voice of method ALL
 * This endpoint is the TwiML instruction for the call that was initiated.
 * It returns the appropriate TwiML instruction based on whether the call was answered by a human or a machine.
 * Calls answered by a human will be recorded and transcribed.
 * If the call is answered by a machine, the voicemail message will be played instead.
 */
app.all("/voice", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const answeredBy = req.body.AnsweredBy;

  // If human picks up the phone, greet and remind about medications.
  if (answeredBy === "human") {
    twiml.say(
      "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
    );

    twiml.record({
      transcribe: true,
      transcribeCallback: `${process.env.BASE_URL}/transcription`,
      action: `${process.env.BASE_URL}/recording-complete`,
      maxLength: 10,
      playBeep: true,
    });
  }
  // If answered by machine, proceed to voicemail message.
  else if (answeredBy && answeredBy.startsWith("machine")) {
    twiml.say(
      "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so. Thank you and goodbye."
    );
    twiml.hangup();
  }
  // Assume that the user picked up the call but did not speak.
  else {
    twiml.say(
      "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
    );
    twiml.record({
      transcribe: true,
      transcribeCallback: `${process.env.BASE_URL}/transcription`,
      action: `${process.env.BASE_URL}/recording-complete`,
      maxLength: 10,
      playBeep: true,
    });
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /recording-complete of method POST
 * This endpoint is called right after the recording process is compelted.
 */
app.post("/recording-complete", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  twiml.say("Your response has been recorded. Thank you. Goodbye.");
  twiml.hangup();
  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /transcription of method POST
 * This endpoint gets the transcribed text of the call recording.
 * And displays the transcription text and recording URL in the console.
 */
app.post("/transcription", async (req, res) => {
  const transcriptionText = req.body.TranscriptionText;
  const callSid = req.body.CallSid;
  const recordingUrl = req.body.RecordingUrl || "";
  if (transcriptionText && callSid) {
    console.log(`Call Transcript: ${transcriptionText}`);
    console.log(`Recording URL: ${recordingUrl}`);
  } else {
    console.error("Couldn't get the transcription text.");
  }
});

/**
 * End-point /status of method POST
 * This endpoint receives status updates of the call throughout it's life cycle.
 * The call data log happens here. After each call or call attempt, the status of the call is updated.
 * Also handles the SMS fallback for when a call is not answered or fails.
 */
app.post("/status", async (req, res) => {
  const { CallSid, CallStatus, From, To, AnsweredBy } = req.body;

  if (
    CallStatus === "completed" ||
    CallStatus === "no-answer" ||
    CallStatus === "failed"
  ) {
    let finalStatus = "";
    if (CallStatus === "no-answer" || CallStatus === "failed") {
      finalStatus = "SMS sent";
    } else if (CallStatus === "completed") {
      if (AnsweredBy && AnsweredBy.includes("machine")) {
        finalStatus = "voicemail sent";
      } else {
        finalStatus = "answered";
      }
    }
    console.log(`Call SID: ${CallSid}, Status: ${finalStatus}`);
    if (CallStatus === "completed" && !AnsweredBy) {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      try {
        await client.messages.create({
          body: "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so.",
          from: process.env.TWILIO_PHONE_NUMBER,
          to: To,
        });
      } catch (error) {
        console.error("Error sending SMS fallback:", error);
      }
    }
  }

  res.sendStatus(200);
});

/**
 * End-point /incoming of method ALL
 * This endpoint is for handling incoming calls from patients.
 */
app.all("/incoming", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  twiml.say(
    "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
  );
  twiml.hangup();
  res.type("text/xml");
  res.send(twiml.toString());
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
