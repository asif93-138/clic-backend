import { Request, Response } from 'express';
// import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import User from '../models/user.model';
import { sendEmail } from '../utils/sendEmail';
import sendPushNotificationNow from '../utils/sendPushNotificationNow';

// cloudinary.config({
//     cloud_name: "dganhxhid",
//     api_key: "672381925111413",
//     api_secret: "KYxtoS3wN2T8eLq0qUP5USr7XQc",
// });


// interface User {
//     // Define the properties of the User object if needed
// }

export async function getAllUsers(req: Request, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const users = await User.find({}, { password: 0 });
        const usersP = await User.find({approved: "pending"}, { password: 0 });
        const usersA = await User.find({approved: "approved"}, { password: 0 });
        res.json({users, usersP, usersA});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUser(req: any, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.user }, { password: 0 });
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

        const dataObj = req.body;
        dataObj.imgURL = "uploads/" + req.file.filename;
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

export const sendEmailC = async (req: Request, res: Response) => {
  const { email, username } = req.body;

  try {
    await sendEmail(
      email,
      'Welcome to MyApp!',
      `Hello ${username}, welcome to MyApp!`, 
      `<h1>Hello ${username}</h1><p>Thanks for signing up!</p>`
    );

    res.status(201).json({ message: 'User created and email sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Signup succeeded, but email failed.' });
  }
};

export async function pushNotificationUpdate(req: any, res: Response): Promise<void> {
    try {
        console.log(req.user); console.log(req.body);
        const result = await User.findOneAndUpdate(
            {_id: req.user, expoPushToken: { $ne: req.body.expoPushToken }},
            { $set: { expoPushToken: req.body.expoPushToken } },
            { new: true}
        );
        console.log(result);
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function pushNotificationTest(req: any, res: Response): Promise<void> {
  const userId = "67fb90bc3bfce5f0a942d3bb"
  const title = "This is title"
  const body = "This is body"

  const user = await User.findOne({ _id: userId });
  if (!user?.expoPushToken) {
    res.status(400).json({ error: 'User has no push token' });
  }

  await sendPushNotificationNow(user?.expoPushToken, title, body);
  res.sendStatus(200);
}
