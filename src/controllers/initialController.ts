import { MongoClient } from "mongodb";
import { url, dbName } from "./config/dbConfig";

interface Request {
    // Define the properties of the request object if needed
}

interface Response {
    json: (body: any) => void;
}

export default async function initialController(req: Request, res: Response): Promise<void> {
    try {
        const client = new MongoClient(url);
        await client.connect();
        const db = client.db(dbName);
        // Optional: Check if the database is accessible
        const collections: { name: string }[] = await db.listCollections().toArray();
        res.json({ status: "Click server is running", data: collections });
        client.close();
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}