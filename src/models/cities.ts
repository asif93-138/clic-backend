import mongoose, { Schema, Document } from "mongoose";

export interface ICity extends Document {
  city: string;
}

const CitySchema: Schema = new Schema({
  city: { type: String, required: true }
});

export default mongoose.model<ICity>("City", CitySchema);
