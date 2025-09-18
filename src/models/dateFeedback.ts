import mongoose from "mongoose";

const DateFeedbackSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    user_id: { type: String, required: true },
    other_user_id: { type: String, required: true },
    dateRoomDocId: { type: String, required: true },
    swipeRight: { type: String, required: true },
    wantedToTalkLonger: { type: String, required: true },
    rating: {type: Number, required: true},
  },
  { timestamps: true }
);

const DateFeedback = mongoose.model("DateFeedback", DateFeedbackSchema);

export default DateFeedback;