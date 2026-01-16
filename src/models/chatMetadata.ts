import mongoose from "mongoose";

const ChatMetadataSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      index: true,
      unique: true,
    },

    name: {
      type: String, // group name (null for direct chat)
    },

    mutedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
  },
  { timestamps: true }
);

const ChatMetadata = mongoose.model("ChatMetadata", ChatMetadataSchema);
export default ChatMetadata;