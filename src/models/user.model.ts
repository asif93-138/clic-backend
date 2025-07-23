import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    userName: string;
    email: string;
    password: string;
    imgURL: string;
    gender: string;
    city: string;
    approved: string;
    expoPushToken?: string;
    ques_ans?: object;
    interests?: string[];
}

const UserSchema: Schema = new Schema(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    imgURL: { type: String, required: true },
    dateOfBirth: {type: Date, require: true},
    gender: { type: String, required: true },
    city: { type: String, required: true },
    approved: { type: String, default: 'pending' },
    expoPushToken: { type: String, default: '' },
    ques_ans: { type: Array },
    interests: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
