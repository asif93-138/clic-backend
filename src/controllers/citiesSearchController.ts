import { Request, Response } from "express";
import mongoose from "mongoose";

// Define the City schema
const citySchema = new mongoose.Schema({
  city: String, // Updated to match your database field name
});

// Create the City model
const City = mongoose.model("City", citySchema, "cities"); // Explicitly use "cities" collection

export default async function citiesSearchController (req: Request, res: Response) {
    try {
      const query = req.query.q as string;
  
      if (!query) {
         res.status(400).json({ message: "Query parameter 'q' is required" });
         return;
      }
  
      // Case-insensitive search using regex on the "city" field
      const matchedCities = await City.find({
        city: { $regex: query, $options: "i" },
      });
  
      res.json(matchedCities);
    } catch (error) {
      res.status(500).json({ error: "Error searching for cities" });
    }
  };
