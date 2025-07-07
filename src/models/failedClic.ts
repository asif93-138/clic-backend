import mongoose from "mongoose";

const FailedClicSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    dateRoomDocId: {type: String, required: true},
    person_1: { type: String, required: true },
    person_2: { type: String, required: true },
    requested: { type: String, required: true },
  },
  { timestamps: true }
);

const FailedClic = mongoose.model("FailedClic", FailedClicSchema);

export default FailedClic;