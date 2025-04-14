import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import User from '../models/user.model';
import { hasTimePassedPlus3Hours } from '../server';

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
        if (result && Array.isArray(result.pending_members) && Array.isArray(result.approved_members)) {
            const arr = [...result.pending_members, ...result.approved_members];
            const users = await User.find({ _id: { $in: arr } });
            res.json({ members: users, result });
        } else {
            res.json(result);
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getEventForApp(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const resultOld = await Event.findOne({ _id: req.params.id });
        if (resultOld && Array.isArray(resultOld.pending_members) && Array.isArray(resultOld.approved_members)) {
            const arr = [...resultOld.pending_members, ...resultOld.approved_members];
            const users = await User.find({ _id: { $in: arr } });

            const result: any = resultOld;
            
            if (resultOld.event_durations && resultOld.event_durations.length > 0) {
                result.event_end_time = hasTimePassedPlus3Hours(resultOld.date_time, resultOld.event_durations[0]).adjustedTime;
            }

            // user obj
            const userObj:any = await User.findOne({ _id: req.user });
            const user = {user_id:req.user,
                username: userObj.userName,
                imgURL: userObj.imgURL,
                gender:userObj.gender[0],
                interested: userObj.gender[0] === 'M' ? "F" : "M" 
            }

            if (resultOld.pending_members.includes(req.user)) {
                res.json({ members: users, result, btnTxt: 'pending', user });
            } else if (resultOld.approved_members.includes(req.user)) {
                res.json({ members: users, result, btnTxt: 'cancel', user });
            } else {
                res.json({ members: users, result, btnTxt: 'join', user });
            }
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserPool(req: any, res: Response): Promise<void> {
    try {
        let arr_1: any[] = [], arr_2: any[] = [];
        const userResult = await eventUser.find({ user_id: req.user });
        userResult.forEach((element: any) => {
            if (element.status === "pending") {
                arr_1.push(element.event_id);
            } else if (element.status === "approved") {
                arr_2.push(element.event_id);
            }
        });
        if (arr_1.length > 0) {
            const pendingResult = await Event.find({ _id: { $in: arr_1 } });
            arr_1 = pendingResult;
        }
        if (arr_2.length > 0) {
            const approvedResult = await Event.find({ _id: { $in: arr_2 } });
            arr_2 = approvedResult;
        }
        const upcomingResult = await Event.find()
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)
            .limit(10); // Limit to the latest 10 documents

        res.json({ pending: arr_1, approved: arr_2, upcoming: upcomingResult });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function createEvent(req: any, res: Response): Promise<void> {
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
        dataObj.event_durations = JSON.parse(dataObj.event_durations);
        dataObj.imgURL = result.secure_url;
        const insertResult = await Event.create(dataObj);
        res.json(insertResult);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getEventApplicationAndApproval(req: Request, res: Response): Promise<void> {
    try {
        const result = await eventUser.find();
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function applyEvent(req: any, res: Response): Promise<void> {
    try {
        const {eventId, btnTxt, approved_members, pending_members, status} = req.body;
        const dataObj_1 = {event_id: eventId, user_id: req.user, btnTxt, status};
        const dataObj_2 = {approved_members, pending_members};
        if (dataObj_1.btnTxt === 'join') {
            dataObj_1.status = 'pending';
            dataObj_2.pending_members.push(dataObj_1.user_id);
            console.log(dataObj_1);
            const insertResult = await eventUser.create(dataObj_1);
            console.log(insertResult);
            const updatedResult = await Event.findByIdAndUpdate(dataObj_1.event_id, dataObj_2);
            if (insertResult._id && updatedResult && updatedResult._id) {
                res.json({ btnTxt: 'pending' });
            } else {
                res.status(400).json({ message: "failed!" });
            }
        } else {
            dataObj_2.approved_members.splice(dataObj_2.approved_members.indexOf(dataObj_1.user_id), 1);
            const updatedResult = await Event.findByIdAndUpdate(dataObj_1.event_id, dataObj_2);
            const deleteResult = await eventUser.deleteOne({ 
                user_id: dataObj_1.user_id, 
                event_id: dataObj_1.event_id 
              });
              
            if (updatedResult && updatedResult._id && deleteResult.acknowledged) {
                res.json({ btnTxt: 'join' });
            }   else {
                res.status(400).json({ message: "failed!" });
            }
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
        const eventUserResult = await eventUser.updateOne(
            { user_id: dataObj_1.user_id, event_id: dataObj_1.event_id },
            { $set: dataObj_2 }
          );          
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

export async function updateEvent(req: any, res: Response): Promise<void> {
    // console.log("Request Params:", req.params);
    // console.log("Request Obj:", req.body);
    // console.log("Request Obj:", req.file);

    try {
        if (!req.params || !req.params.id) {
            res.status(400).json({ message: 'Event ID is required' });
            return;
        }

        if (req.file) {
            // Upload to Cloudinary
            const cloudinaryRes = await cloudinary.uploader.upload(req.file.path, {
                folder: 'your_folder_name', // Optional: specify a folder in Cloudinary
            });

            // Delete the file from local storage
            fs.unlinkSync(req.file.path);

            const dataObj = req.body;
            dataObj.imgURL = cloudinaryRes.secure_url;
            const result = await Event.findByIdAndUpdate(req.params.id, dataObj);
            res.json(result);
        } else {
            const dataObj = req.body;
            const result = await Event.findByIdAndUpdate(req.params.id, dataObj);
            res.json(result);
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}