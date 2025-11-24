import mongoose from "mongoose";
import connectDB from "../config/dbConfig";

// Root-level hooks - run ONCE for all test suites
beforeAll(async () => {
  console.log("SETUP: Connecting MongoDB...");
  await connectDB();
  await mongoose.connection.dropDatabase();
  console.log("Database dropped successfully");
});

afterAll(async () => {
  // await mongoose.connection.dropDatabase();
  //   console.log("Database dropped successfully");
  console.log("SETUP: Disconnecting MongoDB...");
  await mongoose.disconnect();
});