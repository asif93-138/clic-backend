import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import User from '../models/user.model';

cloudinary.config({
    cloud_name: "dganhxhid",
    api_key: "672381925111413",
    api_secret: "KYxtoS3wN2T8eLq0qUP5USr7XQc",
});


interface User {
    // Define the properties of the User object if needed
}

export async function getAllUsers(req: Request, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUser(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.user });
        res.json(user);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserPP(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.user }).select("imgURL");
        res.json(user);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserProfile(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.user }).select("email userName");
        res.json(user);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserApproved(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.user });
        res.json({approved: user!.approved});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function checkUsers(req: Request, res: Response): Promise<void> {
    try {
        const isExistsEmail = await User.findOne({ email: req.query.email });
        const isExistsUserName = await User.findOne({ userName: req.query.userName }); 
        if (isExistsEmail && isExistsUserName) {
            res.status(400).json({ message: "User Name and Email exists" });
        } else if (isExistsEmail) {
            res.status(400).json({ message: "User Email exists" });
        } else if (isExistsUserName) {
            res.status(400).json({ message: "User Name exists" });
        } else {
            res.status(200).json({ message: "User does not exist" });
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}


export async function createUser(req: Request, res: Response): Promise<void> {
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
        const hashedPassword = await bcrypt.hash(dataObj.password, 10);
        dataObj.password = hashedPassword;
        const newUser = new User(dataObj);
        await newUser.save();
        const token = generateToken({ id: newUser._id });
        res.json({newUser, token});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        if (!req.params || !req.params.id) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const result = await User.findByIdAndUpdate(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}