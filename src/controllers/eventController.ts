import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import User from '../models/user.model';

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
        if (result && result.pending_members && result.pending_members.length > 0) {
            const users = await User.find({ _id: { $in: result.pending_members } });
            res.json({pending: users, result});
        } else {
            res.json(result);
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserPool(req: any, res: Response): Promise<void> {
    try {
        const userResult = await eventUser.find({ user_id: req.user });
        const upcomingResult = await Event.find()
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)
            .limit(10); // Limit to the latest 10 documents

        res.json({appliedAndConfirmed: userResult, upcoming: upcomingResult});
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

export async function applyEvent(req: Request, res: Response): Promise<void> {
    try {
        const dataObj_1 = req.body.firstObj;
        const dataObj_2 = req.body.secondObj;
        const insertResult = await eventUser.create(dataObj_1);
        const updatedResult = await Event.findByIdAndUpdate(dataObj_1.event_id, dataObj_2);
        if (insertResult._id && updatedResult && updatedResult._id) {
            res.json({ message: "Successfully applied to event" });
        } else {
            res.status(400).json({ message: "failed!" });
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function approveEventUser(req: Request, res: Response): Promise<void> {
    try {
        const dataObj_1 = req.body.firstObj;
        const dataObj_2 = req.body.secondObj;
        const dataObj_3 = req.body.thirdObj;
        const eventUserResult = await eventUser.updateOne({user_id: dataObj_1.user_id} , dataObj_2);
        const eventResult = await Event.findByIdAndUpdate(dataObj_1.event_id, dataObj_3);
        if (eventUserResult.acknowledged && eventResult && eventResult._id) {
            res.json({ message: "Successfully approved user!" });
        } else {
            res.status(400).json({ message: "failed!" });
        }
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