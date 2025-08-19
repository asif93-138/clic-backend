import { Request, Response } from 'express';

import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import User from '../models/user.model';
import { sendEmail } from '../utils/sendEmail';
import sendPushNotificationNow from '../utils/sendPushNotificationNow';
import verificationCode from '../models/verificationCode';
import notification from '../models/notification';


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
        // console.log(req.file); console.log(req.body);
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // res.send("OK");
        const dataObj = req.body;
        dataObj.imgURL = "uploads/" + req.file.filename;
        const hashedPassword = await bcrypt.hash(dataObj.password, 10);
        dataObj.password = hashedPassword;
        const newUser = new User(dataObj);
        await newUser.save();
        const token = generateToken({ id: newUser._id });
        // await sendEmail(
        //     "thehumanchemistrypilot@gmail.com",
        //     "New member registered",
        //     "Visit admin panel for more details!",
        //     `<img src="https://involved-rosemaria-project-code-clic-b3374d4e.koyeb.app/uploads/${req.file.filename}" width="100" />
        //     <p>Name: ${req.body.userName}</p>
        //     <p>Email: ${req.body.email}</p>
        //     <p>Date of Birth: ${req.body.dateOfBirth}</p>
        //     <p>Occupation: ${req.body.occupation}</p>
        //     <p>Gender: ${req.body.gender}</p>
        //     <p>From (city): ${req.body.where_from}</p>
        //     <p>Lives (city): ${req.body.where_live}</p>
        //     <p><b>Visit admin panel for more details!</b></p>`    
        // );
        const notificationData = new notification({
            type: "signup",
            data: {
                _id: newUser._id,
                name: newUser.userName
            }
        });
        await notificationData.save();
        res.json({newUser, token});

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        res.status(400).send("something went wrong.");
    }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        if (!req.query || !req.query.email) {
            res.status(400).json({ message: 'User email is required' });
            return;
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const result = await User.findOneAndUpdate({email: req.query.email}, {password: hashedPassword});
        if (result?._id) res.status(200).send("ok");
        else res.status(400).send("wrong");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export const sendEmailC = async (req: Request, res: Response) => {
  const { email, username } = req.body;

  try {
    await sendEmail(
      email,
      'Nodemailer Testing (Final)',
      `Hello ${username}, All tests are successful!`
    );

    res.status(201).json({ message: 'email sent.' });
  } catch (err) {
    res.status(500).json({ message: 'email failed.' });
  }
};

export const emailVerificationC = async (req: Request, res: Response) => {
  const { email, fp } = req.body;
  const randomCode = Math.floor(Math.random() * (999999 - 100000 + 1) ) + 100000;
  
  try {
    // const result = await verificationCode.create({email: email, code: randomCode});
    const result = await verificationCode.findOneAndUpdate({email}, {code: randomCode, expireAt: new Date(Date.now() + 5 * 60 * 1000)}, {upsert: true, new: true});
    const emailResult = await sendEmail(
      email,
      fp === "yes" ? "Reset code for password (Clic Club)" : 'Verify your email (Clic Club)',
      `Your code : ${randomCode}`
    );
    if (result._id && emailResult.accepted[0] == email) res.status(200).json({ message: 'email sent.' });
    else res.status(500).json({ message: 'email failed.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'email failed.' });
  }
};

export async function matchVerificationCode(req: Request, res: Response) {
    const {email, code} = req.body;
    const checkCode = await verificationCode.findOne({email});
    if (checkCode?.code == code) {
        res.status(201).send("new user");
    }
    else {res.status(401).send("Wrong");}
}

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
