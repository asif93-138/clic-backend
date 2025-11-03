import mongoose from "mongoose";

const DatingRoomSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true },
    pair: {type: [String], required: true},
    userData: {type: [Object], required: true},
    dateRoomId: {type: String, required: true},
    extension: {type: [String], required: true},
    sessionExpired: {type: Boolean},
  },
  { timestamps: true }
);

const DatingRoom = mongoose.model("DatingRoom", DatingRoomSchema);

export default DatingRoom;