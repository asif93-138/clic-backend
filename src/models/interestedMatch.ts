import mongoose from "mongoose";

const InterestedMatchSchema = new mongoose.Schema(
  {
    liked: { type: String, required: true },
    likedBy: { type: String, required: true },
  },
  { timestamps: true }
);

const InterestedMatch = mongoose.model("InterestedMatch", InterestedMatchSchema);

export default InterestedMatch;