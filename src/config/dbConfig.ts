import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || "";

const connectDB = async (test?: boolean) => {
  try {
    if (test) {
      await mongoose.connect(process.env.MONGO_TEST_URI || "");
    } else {
      await mongoose.connect(MONGO_URI);
    }

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
