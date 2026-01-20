import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ],

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: false, // only for group chats if you want
    },

    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages",
    },

    lastMessage: {type: String},

    lastMessageSender: {type: String},

    lastMessageTime: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔥 Critical inbox index
ChatSchema.index({ type: 1, participants: 1 });
ChatSchema.index({ participants: 1, lastMessageTime: -1 });

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;