import mongoose, { Schema, Document } from "mongoose";

export interface IEventUser extends Document {
    event_id: string;
    user_id: string;
    status: string;
}   

const EventUserSchema: Schema = new Schema(
    {
        event_id: { type: String, required: true }, 
        user_id: { type: String, required: true },
        status: { type: String, required: true }
    },
    { timestamps: true }
);

export default mongoose.model<IEventUser>("EventUser", EventUserSchema);