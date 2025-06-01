import mongoose from "mongoose";

const WaitingRoomSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    user_id: { type: String, required: true },
    gender: { type: String, required: true },
    interested: { type: String, required: true },
    status: {type: String, required: true}
  },
  { timestamps: true }
);

const WaitingRoom = mongoose.model("WaitingRoom", WaitingRoomSchema);

export default WaitingRoom;