import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();
// console.log(process.env.MONGO_URI);

export const MONGO_URI = process.env.MONGO_URI || "";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Local Connected");
    // console.log("MongoDB Cloud Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;