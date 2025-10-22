import { Request, Response } from 'express';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import User from '../models/user.model';
import { sendEmail } from '../utils/sendEmail';
import sendPushNotificationNow from '../utils/sendPushNotificationNow';
import verificationCode from '../models/verificationCode';
import notification from '../models/notification';
import cloudinary from '../utils/cloudinary';
import invitations from '../models/invitations';
import eventUser from '../models/eventUser';
import EventCancellation from '../models/eventCancellation';
import path from 'path';

export async function getAllUsers(req: Request, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const users = await User.find({}, { password: 0 });
        const usersP = await User.find({approved: "pending"}, { password: 0 });
        const usersA = await User.find({approved: "approved"}, { password: 0 });
        const pendingUID = usersP.map((x:any) => x._id.toString());
        res.json({users, usersP, usersA, pendingUID});
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

export async function getUserData(req: Request, res: Response): Promise<void> {
    try {
        // Optional: Check if the database is accessible
        const user = await User.findOne({ _id: req.params.id }, { password: 0, expoPushToken: 0 });
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


export async function createUser(req: any, res: Response): Promise<void> {
    try {
        // console.log(req.file); console.log(req.body);
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // res.send("OK");
        const dataObj = req.body;
        dataObj.imgURL = "uploads/" + req.file.filename;
        dataObj.cloud_imgURL = req.file.cloudinaryUrl;
        const hashedPassword = await bcrypt.hash(dataObj.password, 10);
        dataObj.password = hashedPassword;
        const newUser = new User(dataObj);
        await newUser.save();
        const token = generateToken({ id: newUser._id });
let qaTxt = "";
JSON.parse(dataObj.ques_ans).forEach((x: { question: string; selectedAns: string; }, y: number) => 
    qaTxt += `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #212529; font-size: 15px;">${y+1}. ${x.question}</p>
            <p style="margin: 0; color: #495057; font-size: 14px; padding-left: 20px;">→ ${x.selectedAns}</p>
        </div>
    `
);

await sendEmail(
    "thehumanchemistrypilot@gmail.com",
    "New member registered",
    "Visit admin panel for more details!",
    `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">New Member Registration</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">A new member has joined the community</p>
        </div>
        
       
        <div style="padding: 40px 30px; background-color: #ffffff;">
             
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://involved-rosemaria-project-code-clic-b3374d4e.koyeb.app/uploads/${req.file.filename}" 
                     width="120" 
                     style="border-radius: 5%; border: 4px solid #667eea; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" 
                     alt="Profile" />
            </div>
            
            
            <div style="margin-bottom: 35px;">
                <h2 style="color: #667eea; font-size: 20px; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-weight: 600;">Personal Information</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057; width: 40%;">Name:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.userName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Email:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Date of Birth:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.dateOfBirth}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Occupation:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.occupation}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Gender:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.gender}</td>
                    </tr>
                </table>
            </div>
            
             
            <div style="margin-bottom: 35px;">
                <h2 style="color: #667eea; font-size: 20px; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-weight: 600;">Location Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057; width: 40%;">From (city):</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.where_from}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Lives (city):</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.where_live}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Cities Frequent:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.cities_frequent}</td>
                    </tr>
                </table>
            </div>
            
           
            <div style="margin-bottom: 35px;">
                <h2 style="color: #667eea; font-size: 20px; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-weight: 600;">Social & Referral</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057; width: 40%;">Heard from:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.hearingPlatform}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Referred By:</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.referredBy}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Social Media (Platform):</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.socialMediaObj}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 15px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">Social Media (Handle):</td>
                        <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e9ecef; color: #212529;">${req.body.socialMediaHandle}</td>
                    </tr>
                </table>
            </div>
            
             
            <div style="margin-bottom: 35px;">
                <h2 style="color: #667eea; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-weight: 600;">About</h2>
                <p style="margin: 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; color: #495057; line-height: 1.6; font-size: 14px;">${req.body.about || 'No information provided'}</p>
            </div>
            
             
            <div style="margin-bottom: 30px;">
                <h2 style="color: #667eea; font-size: 20px; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; font-weight: 600;">Q/A Test Results</h2>
                ${qaTxt}
            </div>
            
         
            <div style="text-align: center; margin-top: 40px; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <p style="color: #ffffff; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">View complete member details</p>
                <a href="https://skyblue-alpaca-975080.hostingersite.com/" 
                   style="display: inline-block; padding: 12px 30px; background-color: #ffffff; color: #667eea; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    Visit Admin Panel
                </a>
            </div>
        </div>
        
       
        <div style="padding: 20px 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 13px;">This is an automated notification from your member registration system</p>
        </div>
    </div>
    `
);
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

export async function updatePass(req: Request, res: Response): Promise<void> {
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

export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        if (!req.params || !req.params.id) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        const result = await User.findByIdAndUpdate(req.params.id, {approved: req.body.approved});
        if (req.body.approved == "approved") {
            await sendEmail(
                req.body.email,
                "Welcome to Clic Club",
                "Congratulations! You're a member of Clic Club. You can now sign up to any of our scheduled online events, called Pools, to meet a selection of our members. Have fun!"
            ); 
        }
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function updateUserApp(req: any, res: Response): Promise<void> {
    try {
        if (req.file) {
            const userData = await User.findById(req.user, "imgURL cloud_imgURL");

            // Delete previous file from local storage (wrapped in try/catch)
            if (userData?.imgURL) {
                try {
                    const oldPath = path.join(req.file.destination, userData.imgURL.replace("uploads/", ""));
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                } catch (err) {
                    console.error("Local file deletion failed:", err);
                }
            }

            // Delete previous file from cloud
            const parts = userData!.cloud_imgURL.split("/");
            const fileWithExt = parts.slice(-2).join("/"); // "my_app_uploads/abc123.png"
            await cloudinary.uploader.destroy(fileWithExt.replace(/\.[^/.]+$/, ""));

            const dataObj = req.body;
            dataObj.imgURL = "uploads/" + req.file.filename;
            dataObj.cloud_imgURL = req.file.cloudinaryUrl;
            const result = await User.findByIdAndUpdate(req.user, dataObj, { new: true });
            res.json(result);
        }
        else {
            const result = await User.findByIdAndUpdate(req.user, req.body, { new: true });
            res.json(result);
        }
    } catch (error) {
        console.error("Error updating profile picture:", error);
    }
}

// export async function updateUserApp(req: any, res: Response): Promise<void> {
//     console.log("req.user :", req.user);
//     console.log("req.file :", req.file);
//     console.log("req.body :", req.body);
//     try {
//         if (req.file) {
//             // const userData = await User.findById(req.user, "imgURL cloud_imgURL");
//             // console.log("userData :", userData);

//             const dataObj:any = {};
//             dataObj.imgURL = "uploads/" + req.file.filename;
//             dataObj.cloud_imgURL = req.file.cloudinaryUrl;
//             console.log("dataObj :", dataObj);
//             const result = await User.findByIdAndUpdate(req.user, dataObj);
//             res.json(result);
//         }
//         else {
//             console.log("req.body :", req.body);
//             const result = await User.findByIdAndUpdate(req.user, req.body);
//             console.log("result :", result);
//             res.json(result);
//         }
//     } catch (error) {
//         console.error("Error updating profile picture:", error);
//     }
// }


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

export async function searchUser(req: Request, res: Response) {
    const users = await User.find({
        approved: "approved", // only approved users
        $or: [
            { userName: { $regex: req.query.data, $options: "i" } },
            { email: { $regex: req.query.data, $options: "i" } }
        ]
    }, "userName email imgURL");

    res.json(users);
}

export async function getInvites(req: any, res: Response) {
    const invites = await invitations.find({user_id: req.user});
    res.json(invites);
}
export async function updateInvite(req: any, res: Response) {
    try {
        if (req.body.status == 'rejected') {
            const invites = await invitations.findByIdAndUpdate(req.params.id, req.body);
            res.json(invites);
        }
        else {
            await EventCancellation.deleteOne({event_id: req.body.event_id, title: req.body.title, user_id: req.user, userName: req.body.userName,});
            const invites = await invitations.findByIdAndUpdate(req.params.id, req.body);
            const dataObj = req.body;
            dataObj.status = 'approved';
            dataObj.user_id = req.user;
            const approval = await eventUser.create(dataObj);
            // const notificationData = new notification({
            //     type: "rsvp",
            //     data: {
            //         event_id: event_id,
            //         user_id: req.user,
            //         eventTitle: title,
            //         userName: userName
            //     }
            // });
            // await notificationData.save();
            res.json(invites);
        }
    }
    catch (error) {
        console.log("Error in updating invitation:", error);
    }
}