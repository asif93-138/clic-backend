import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
    title: string;
    imgURL: string;
    description: string;
    date_time: string;
    location: string;
    event_durations?: number[];
    event_end_time: string;
}

const EventSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        imgURL: { type: String, required: true },
        description: { type: String, required: true },
        date_time: { type: String, required: true },
        location: { type: String, required: true },
        event_durations: { type: [Number] },
        event_end_time: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);