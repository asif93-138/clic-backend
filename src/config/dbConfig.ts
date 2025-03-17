// import { MongoClient } from "mongodb";


// // MongoDB connection URL
// export const url = "mongodb://localhost:27017"; // 127.0.0.1
// export const dbName = "mydb";

// export default async function connectDB() {
//     try {
//         const client = new MongoClient(url);
//         await client.connect();
//         console.log("Database connected!");
//         const db = client.db(dbName);
//         await db.createCollection('users');
//         // Optional: Check if the database is accessible
//         const collections = await db.listCollections().toArray();
//         console.log("total collections:", collections.length);

//         client.close();
//     } catch (error) {
//         console.error("Error connecting to MongoDB:", error);
//     }
// }

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydb";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
