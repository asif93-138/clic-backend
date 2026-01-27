import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
      type: String,
      enum: ["text", "photo", "audio", "video", "invitation"],
      required: true,
  },
  event_id: {type: mongoose.Schema.Types.ObjectId, ref: "Event"},
  text: { type: String },
  media: [{ url: String, type: String }], // optional
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // read receipts
},
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, senderId: 1 });
MessageSchema.index({ readBy: 1 });

const Messages = mongoose.model("Messages", MessageSchema);

export default Messages;
