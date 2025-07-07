import mongoose from "mongoose";

const MatchedSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    dateRoomDocId: { type: String, required: true },
    person_1: { type: String, required: true },
    person_2: { type: String, required: true },
    count: { type: Number, required: true },
  },
  { timestamps: true }
);

const Matched = mongoose.model("Matched", MatchedSchema);

export default Matched;