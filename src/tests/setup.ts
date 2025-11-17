import mongoose from "mongoose";
import connectDB from "../config/dbConfig";

beforeAll(async () => {
  console.log("Connecting to MongoDB before all tests...");
  await connectDB();
});

afterAll(async () => {
  console.log("Disconnecting MongoDB after all tests...");
  await mongoose.disconnect();
});
