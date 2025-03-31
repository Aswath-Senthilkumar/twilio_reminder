const mongoose = require("mongoose");

// Attributes for the CallLog model.
const CallLogSchema = new mongoose.Schema({
  callSid: { type: String, required: true },
  callStatus: { type: String },
  callType: { type: String },
  from: { type: String },
  to: { type: String },
  answeredBy: { type: String },
  recordingUrl: { type: String },
  liveCapturedTranscript: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  errorMsg: { type: String },
});

module.exports = mongoose.model("CallLog", CallLogSchema);
