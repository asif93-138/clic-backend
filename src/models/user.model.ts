import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    userName: string;
    email: string;
    password: string;
    imgURL: string;
    gender: string;
    city: string;
    approved: boolean;
    ques_ans?: object;
    interests?: string[];
}

const UserSchema: Schema = new Schema(
  {
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    imgURL: { type: String, required: true },
    gender: { type: String, required: true },
    city: { type: String, required: true },
    approved: { type: Boolean, default: false },
    ques_ans: { type: Object },
    interests: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
