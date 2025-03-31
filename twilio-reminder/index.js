require("dotenv").config(); // Load the environment variables from .env
require("./db"); // MongoDB connection setup

// Importing required modules and setting up the server.
const express = require("express");
const twilio = require("twilio");
const CallLog = require("./models/CallLog");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

// Using Google Speech-to-Text API for transcribing real-time audio.
const speech = require("@google-cloud/speech");

// Google Cloud Speech-to-Text client for real-time transcription with 2 second debounce approach.
const speechClient = new speech.SpeechClient();

// Configuring the transcript request.
const requestConfig = {
  config: {
    encoding: "MULAW",
    sampleRateHertz: 8000,
    languageCode: "en-US",
  },
  interimResults: true,
};

const app = express();
const port = process.env.PORT || 8080;

// Gathering environment variables for Twilio and ngrok.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

// body-parser middleware to parse incoming request bodies.
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
      statusCallbackEvent: ["initiated", "ringing", "in-progress", "completed"],
      statusCallbackMethod: "POST",
      record: "true",
      recordingStatusCallback: `${BASE_URL}/recording-complete`,
      recordingStatusCallbackMethod: "POST",
    });
    console.log(`Call initiated with SID: ${call.sid}`);
    return res.json({
      message: "Call initiated successfully!",
      callSid: call.sid,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    try {
      await CallLog.create({
        callSid: "unknown",
        callStatus: "error",
        errorMsg: error.message,
        timestamp: new Date(),
      });
      console.log("Error has been logged to DB.");
    } catch (dbError) {
      console.error("Failed to log error to DB:", dbError);
    }
    return res.status(500).json({ error: "Failed to initiate call." });
  }
});

/**
 * End-point /voice of method ALL
 * This endpoint is the TwiML instruction for the call that was initiated.
 * It returns the appropriate TwiML instruction based on whether the call was answered by a human or a machine.
 * Calls answered by a human will be streamed to Google speech to Text API for live transcription.
 * If the call is answered by a machine, the voicemail message will be played instead.
 */
app.all("/voice", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const answeredBy = req.body.AnsweredBy;

  if (answeredBy === "human") {
    twiml
      .start()
      .stream({ url: `wss://${BASE_URL.replace(/^https:\/\//, "")}/media` });
    twiml.say(
      "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
    );
    twiml.pause({ length: 7 });
    twiml.say("Your response has been recorded. Thank you. Goodbye.");
    twiml.hangup();
  } else if (answeredBy && answeredBy.startsWith("machine")) {
    twiml.say(
      "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so. Thank you and goodbye."
    );
    twiml.hangup();
  }
  // Assume that the user picked up the call but did not speak.
  else {
    twiml
      .start()
      .stream({ url: `wss://${BASE_URL.replace(/^https:\/\//, "")}/media` });
    twiml.say(
      "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
    );
    twiml.pause({ length: 7 });
    twiml.say("Your response has been recorded. Thank you. Goodbye.");
    twiml.hangup();
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /recording-complete of method POST
 * This endpoint is called right after the recording process is completed.
 */
app.post("/recording-complete", async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const recordingUrl = req.body.RecordingUrl || "";
  const callSid = req.body.CallSid || "Unknown";

  if (recordingUrl && callSid) {
    console.log(`Recording URL of the call: ${recordingUrl}`);
    try {
      await CallLog.findOneAndUpdate(
        { callSid },
        { recordingUrl },
        { new: true, upsert: true }
      );
      console.log("Recording URL has been updated to the MongoDB database.");
    } catch (err) {
      console.error("Error updating call log with recording URL:", err);
    }
  }
  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /status of method POST
 * This endpoint receives status updates of the call throughout it's life cycle.
 * The call data log happens here. After each call or call attempt, the status of the call is updated.
 * Also handles the SMS fallback for when a call is not answered or fails.
 * Looks for existing and matching callSid in DB and updates the MongoDB database with the final call status, from, to and answered by, If not then callSid is established along with other details.
 */
app.post("/status", async (req, res) => {
  const { CallSid, CallStatus, From, To, AnsweredBy, CallType } = req.body;

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
    try {
      await CallLog.findOneAndUpdate(
        { callSid: CallSid },
        {
          callStatus: finalStatus,
          from: From,
          to: To,
          answeredBy: AnsweredBy || "",
          callType: CallType || "Outbound",
        },
        { new: true, upsert: true }
      );
      console.log(
        "Call SID, Call Status, From, To, Answered By and Call Type has been updated to DB"
      );
    } catch (err) {
      console.error("Error upserting final call log:", err);
    }
    if (
      (CallStatus === "completed" && !AnsweredBy) ||
      finalStatus === "SMS sent"
    ) {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      try {
        await client.messages.create({
          body: "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so.",
          from: TWILIO_PHONE_NUMBER,
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
app.all("/incoming", async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const callType = "Inbound";
  const callSid = req.body.CallSid || "Unknown";
  const from = req.body.From || "Unknown";
  const to = req.body.To || "Unknown";

  try {
    await CallLog.findOneAndUpdate(
      { callSid },
      { callType, from, to },
      { new: true, upsert: true }
    );
    console.log("Incoming call log has been updated to the MongoDB database.");
  } catch (err) {
    console.error("Error upserting incoming call log:", err);
  }

  twiml
    .start()
    .stream({ url: `wss://${BASE_URL.replace(/^https:\/\//, "")}/media` });
  twiml.say(
    "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today."
  );
  twiml.pause({ length: 7 });
  twiml.say("Your response has been recorded. Thank you. Goodbye.");
  twiml.hangup();
  res.type("text/xml");
  res.send(twiml.toString());
});

/**
 * End-point /call-logs of method GET
 * This endpoint retrieves all the call logs from MongoDB and displays in console.
 */
app.get("/call-logs", async (req, res) => {
  try {
    const logs = await CallLog.find({}).sort({ timestamp: -1 });
    console.log("Retrieved call logs:", JSON.stringify(logs, null, 2)); // Logs the calls in latest call first order.
    res.json(logs);
  } catch (err) {
    console.error("Error retrieving call logs:", err);
    res.status(500).json({ error: "Failed to retrieve call logs." });
  }
});

// Creating HTTP & WebSocket server for /media
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/media" });

/**
 * Creating a WebSocket connection =>
 * Creating a recognize stream by passing the transcription request configuration to the Google API.
 * If there is a valid transcript, it will be updated to the buffer and reset the debounce timer.
 * The whole chunk of transcript is finally updated to the MongoDB database.
 * Handling all the WebSocket events: connected (when a new call connects), start (when the media stream starts), media (when the audio stream is received), and stop (when the call ends).
 */
wss.on("connection", function connection(ws) {
  console.log("Connected to /media for live transcription.");

  let recognizeStream = null;
  let callSid = null;

  let transcriptBuffer = "";
  let debounceTimer = null;

  ws.on("message", function incoming(message) {
    const msg = JSON.parse(message);
    switch (msg.event) {
      case "connected":
        console.log("Call has been connected.");
        break;

      case "start":
        callSid = msg.start.callSid;
        console.log(`Passing audio stream for Stream SID: ${msg.streamSid}`);

        recognizeStream = speechClient
          .streamingRecognize(requestConfig)
          .on("error", console.error)
          .on("data", (data) => {
            if (
              data.results[0] &&
              data.results[0].alternatives[0] &&
              data.results[0].alternatives[0].transcript
            ) {
              transcriptBuffer = data.results[0].alternatives[0].transcript;

              if (debounceTimer) clearTimeout(debounceTimer);

              debounceTimer = setTimeout(async () => {
                console.log(`Patient: "${transcriptBuffer}"`);
                try {
                  await CallLog.findOneAndUpdate(
                    { callSid },
                    { $push: { liveCapturedTranscript: transcriptBuffer } },
                    { new: true, upsert: true }
                  );
                  console.log(
                    `Live captured transcript has been updated to the MongoDB database.`
                  );
                } catch (err) {
                  console.error("Error updating liveCapturedTranscript:", err);
                }

                transcriptBuffer = "";
                debounceTimer = null;
              }, 2000);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      event: "interim-transcription",
                      text: data.results[0].alternatives[0].transcript,
                    })
                  );
                }
              });
            }
          });
        break;

      case "media":
        if (recognizeStream) {
          recognizeStream.write(msg.media.payload);
        }
        break;

      case "stop":
        console.log("Call has ended.");
        if (recognizeStream) {
          recognizeStream.destroy();
        }
        break;

      default:
        console.log("Unhandled event:", msg.event);
        break;
    }
  });
});

// Start the server
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
