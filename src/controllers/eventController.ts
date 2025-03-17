import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import Event from '../models/event';

cloudinary.config({
    cloud_name: "dganhxhid",
    api_key: "672381925111413",
    api_secret: "KYxtoS3wN2T8eLq0qUP5USr7XQc",
});


export async function getAllEvents(req: Request, res: Response): Promise<void> {
    try {
        const result = await Event.find();
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getEvent(req: Request, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const result = await Event.findOne({ _id: req.params.id });
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function createEvent(req: any, res: Response): Promise<void> {
    console.log("Request Obj:", req.body);
    try {

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'your_folder_name', // Optional: specify a folder in Cloudinary
        });

        // Delete the file from local storage
        fs.unlinkSync(req.file.path);

        const dataObj = req.body;
        dataObj.imgURL = result.secure_url;
        const insertResult = await Event.create(dataObj);
        res.json(insertResult);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
    console.log("Request Obj:", req.body);
    console.log("Request Params:", req.params);
    try {
        if (!req.params || !req.params.id) {
            res.status(400).json({ message: 'Event ID is required' });
            return;
        }
        const result = await Event.findByIdAndUpdate(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}