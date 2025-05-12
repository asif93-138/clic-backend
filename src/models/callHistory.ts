import mongoose from "mongoose";

const CallHistorySchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    person_1: { type: String, required: true },
    person_2: { type: String, required: true },
  },
  { timestamps: true }
);

const CallHistory = mongoose.model("CallHistory", CallHistorySchema);

export default CallHistory;