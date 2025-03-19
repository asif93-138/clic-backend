import { Request, Response } from 'express';
import mongoose from "mongoose";
import { MONGO_URI } from '../config/dbConfig';


export default async function initialController(req: Request, res: Response): Promise<void> {
    // try {
    //     const client = new MongoClient(url);
    //     await client.connect();
    //     const db = client.db(dbName);
    //     // Optional: Check if the database is accessible
    //     const collections: { name: string }[] = await db.listCollections().toArray();
    //     res.json({ status: "Click server is running", data: collections });
    //     client.close();
    // } catch (error) {
    //     console.error("Error connecting to MongoDB:", error);
    // }
    try {
        // await mongoose.connect(MONGO_URI);
    
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection is not established");
        }
        const collections = await db.listCollections().toArray();
        // console.log(`Number of collections: ${collections.length}`);
        res.json({ status: "Click server is running", totalCollections: collections.length });
        // await mongoose.disconnect();
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
}