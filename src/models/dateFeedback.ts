import mongoose from "mongoose";

const DateFeedbackSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    user_id: { type: String, required: true },
    other_user_id: { type: String, required: true },
    dateRoomDocId: { type: String, required: true },
    rating: {type: Number},
    comment: {type: String},
  },
  { timestamps: true }
);

const DateFeedback = mongoose.model("DateFeedback", DateFeedbackSchema);

export default DateFeedback;