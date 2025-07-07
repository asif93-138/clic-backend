import mongoose from "mongoose";

const CallHistorySchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    dateRoomDocId: { type: String, required: true },
    person_1: { type: String, required: true },
    person_2: { type: String, required: true },
    startedAt: {type: Date},
    endedAt: {type: Date},
    left_early: {type: Boolean},
  },
  { timestamps: true }
);

const CallHistory = mongoose.model("CallHistory", CallHistorySchema);

export default CallHistory;