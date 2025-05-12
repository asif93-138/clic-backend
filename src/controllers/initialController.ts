import { Request, Response } from 'express';
import mongoose from "mongoose";


export default async function initialController(req: Request, res: Response): Promise<void> {
    // }
    try {
    
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