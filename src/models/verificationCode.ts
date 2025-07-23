import mongoose, { Schema } from "mongoose";

const VerificationCodeSchema: Schema = new Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    expires: 0, // this field triggers MongoDB's TTL monitor
  },
}, { timestamps: true });

export default mongoose.model("VerificationCode", VerificationCodeSchema);