import mongoose from "mongoose";

const ClicedSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    dateRoomDocId: { type: String, required: true },
    clics: {type: [String], required: true}, // array of user_ids
    person_1: { type: String, required: true },
    person_2: { type: String, required: true }
  },
  { timestamps: true }
);

const Cliced = mongoose.model("Cliced", ClicedSchema);

export default Cliced;