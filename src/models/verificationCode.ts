import mongoose, { Schema } from "mongoose";

const VerificationCodeSchema: Schema = new Schema({
  email: { type: String, required: true },
  code: { type: String, required: true }
},
{ timestamps: true });

export default mongoose.model("VerificationCode", VerificationCodeSchema);