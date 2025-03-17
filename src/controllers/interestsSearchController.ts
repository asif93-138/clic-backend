import { Request, Response } from "express";
import Interest from "../models/Interest";

export default async function interestsSearchController (req: Request, res: Response) {
    try {
        const query = req.query.q as string;
        if (!query) {res.status(400).json({ error: "Query string is required" }); return;}
    
        const matches = await Interest.find({ name: { $regex: query, $options: "i" } });
        res.json(matches);
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
  };
