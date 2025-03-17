import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
    title: string;
    imgURL: string;
    description: string;
    date_time: string;
    location: string;
    pending_members?: string[];
    approved_members?: string[];
    event_room?: string;
}

const EventSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        imgURL: { type: String, required: true },
        description: { type: String, required: true },
        date_time: { type: String, required: true },
        location: { type: String, required: true },
        pending_members: { type: [String] },
        approved_members: { type: [String] },
        event_room: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);