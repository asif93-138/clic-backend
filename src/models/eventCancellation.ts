import mongoose from "mongoose";

const EventCancellationSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    user_id: { type: String, required: true },
    count: { type: Number, required: true },
    cancelledBy: { type: String, required: true },
  },
  { timestamps: true }
);

const EventCancellation = mongoose.model("EventCancellation", EventCancellationSchema);

export default EventCancellation;