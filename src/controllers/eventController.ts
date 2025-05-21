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
        const result = await Event.findOne({ _id: req.params.id });
        const newResult = await eventUser.find({ event_id: req.params.id });
        const users = await User.find({ _id: { $in: newResult.map(x => x.user_id) } });
        const pending_members: any = []; const approved_members: any = [];
        newResult.forEach(x => {
            if (x.status == 'approved') {
                for (const y of users) {
                    if (y._id == x.user_id) {
                        approved_members.push(x.user_id);
                        break;
                    }
                }
            } else {
                for (const y of users) {
                    if (y._id == x.user_id) {
                        pending_members.push(x.user_id);
                        break;
                    }
                }
            }
        })
        res.json({ members: users, result, approved_members, pending_members });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getEventForApp(req: any, res: Response): Promise<void> {
    try {
        const resultOld = await Event.findOne({ _id: req.params.id });
        res.json(resultOld);
        // const newResult = await eventUser.find({ event_id: req.params.id });
        // const users = await User.find({ _id: { $in: newResult.map(x => x.user_id) } });
        // const result: any = resultOld;

        // if (resultOld?.event_durations && resultOld.event_durations.length > 0) {
        //     result.event_end_time = hasTimePassedPlus3Hours(resultOld.date_time, resultOld.event_durations[0]).adjustedTime;
        // }


        // const userObj: any = await User.findOne({ _id: req.user });
        // const user = {
        //     user_id: req.user,
        //     username: userObj.userName,
        //     imgURL: userObj.imgURL,
        //     gender: userObj.gender[0],
        //     interested: userObj.gender[0] === 'M' ? "F" : "M"
        // }

        // let flag = true;

        // for (const x of newResult) {
        //     if (x.user_id == req.user) {
        //         if (x.status == "approved") {
        //             res.json({ members: users, result, btnTxt: 'cancel', user });
        //         } else {
        //             res.json({ members: users, result, btnTxt: 'pending', user });
        //         }
        //         flag = false;
        //         break;
        //     }
        // }

        // if (flag) {
        //     res.json({ members: users, result, btnTxt: 'join', user });
        // }


    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getUserPool(req: any, res: Response): Promise<void> {

    const userId = req.user;
    const page = 0;
    const limit = 100;

    try {
// const upcomingEvents = await Event.aggregate([
//     {
//         $lookup: {
//             from: "eventusers",
//             let: { eventId: "$_id" },
//             pipeline: [
//                 {
//                     $match: {
//                         $expr: {
//                             $and: [
//                                 { $eq: ["$event_id", { $toString: "$$eventId" }] },
//                                 { $eq: ["$user_id", userId] }
//                             ]
//                         }
//                     }
//                 }
//             ],
//             as: "userStatus"
//         }
//     },
//     {
//         $match: {
//             $expr: {
//                 $not: {
//                     $in: ["approved", "$userStatus.status"]
//                 }
//             }
//         }
//     },
//     {
//         $project: {
//             title: 1,
//             imgURL: 1,
//             date_time: 1,
//             userStatus: 1
//         }
//     },
//     { $sort: { createdAt: 1 } },
//     { $skip: page * limit },
//     { $limit: limit }
// ]);

const upcomingEvents = await Event.aggregate([
  {
    $lookup: {
      from: "eventusers",
      let: { eventId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$event_id", { $toString: "$$eventId" }] },
                { $eq: ["$user_id", userId] },
              ],
            },
          },
        },
      ],
      as: "userEntries",
    },
  },
  {
    $addFields: {
      hasPendingStatus: {
        $in: ["pending", "$userEntries.status"],
      },
      hasApprovedStatus: {
        $in: ["approved", "$userEntries.status"],
      },
      convertedDateTime: {
        $toDate: "$date_time"
      },
      dateTimeDifference: {
        $dateDiff: {
          startDate: new Date(),
          endDate: { $toDate: "$date_time" },
          unit: "day"
        }
      }
    },
  },
  {
    $match: {
      hasApprovedStatus: false,
      $expr: { $gte: [ "$dateTimeDifference", -200 ] }
    },
  },
  {
    $project: {
      title: 1,
      imgURL: 1,
      date_time: 1,
      userStatus: {
        $cond: [
          "$hasPendingStatus",
          "pending",
          "new",
        ],
      },
      createdAt: 1,
    },
  },
  { $sort: { createdAt: -1 } },
  { $skip: page * limit },
  { $limit: limit },
]);

        let arr_1: any[] = [], arr_2: any[] = [];
        const userResult = await eventUser.find({ user_id: req.user });
        userResult.forEach((element: any) => {
            if (element.status === "pending") {
                arr_1.push(element.event_id);
            } else if (element.status === "approved") {
                arr_2.push(element.event_id);
            }
        });
        // if (arr_1.length > 0) {
        //     const pendingResult = await Event.find({ _id: { $in: arr_1 } }, 'title imgURL date_time event_durations').sort({ _id: 1 });
        //     arr_1 = pendingResult;
        // }
        if (arr_2.length > 0) {
            const approvedResult: any = await Event.find({
  _id: { $in: arr_2 },
  date_time: {
    $gte: new Date(new Date().setDate(new Date().getDate() - 200)).toISOString()
  }
}, 'title imgURL date_time event_durations').sort({ createdAt: -1 }).lean();
            const filteredArr: any[] = [];
            approvedResult.forEach((x:any) => {
                x.userStatus = "approved";
                filteredArr.push(x);
            })
            arr_2 = filteredArr;
        }

        const uCObj:any = {};
        upcomingEvents.forEach(x => {
            uCObj[x._id] = x;
        })
        const aPObj:any = {};
        arr_2.forEach(x => {
            aPObj[x._id] = x;
        })

        res.json({ approved: aPObj, upcoming: uCObj }); //  pending: arr_1,
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
        // http://localhost:5000/uploads/1747643112457-930576226.jpg
       
        const dataObj = req.body;
        dataObj.event_durations = JSON.parse(dataObj.event_durations);
        dataObj.imgURL = "uploads/" + req.file.filename;
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
        const { eventId, btnTxt, status } = req.body;
        const dataObj_1 = { event_id: eventId, user_id: req.user, btnTxt, status };
        if (dataObj_1.btnTxt === 'join') {
            dataObj_1.status = 'pending';
            const insertResult = await eventUser.create(dataObj_1);
            if (insertResult._id) {
                res.json({ btnTxt: 'pending' });
            } else {
                res.status(400).json({ message: "failed!" });
            }
        } else {
            const deleteResult = await eventUser.deleteOne({
                user_id: dataObj_1.user_id,
                event_id: dataObj_1.event_id
            });

            if (deleteResult.acknowledged) {
                res.json({ btnTxt: 'join' });
            } else {
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
        const eventUserResult = await eventUser.updateOne(
            { user_id: dataObj_1.user_id, event_id: dataObj_1.event_id },
            { $set: dataObj_2 }
        );
        if (eventUserResult.acknowledged) {
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
            // console.log(req.file);
            // // Upload to Cloudinary
            // const cloudinaryRes = await cloudinary.uploader.upload(req.file.path, {
            //     folder: 'your_folder_name', // Optional: specify a folder in Cloudinary
            // });

            // Delete previous file from local storage
            fs.unlinkSync(req.file.destination + "\\" + req.body.deleteFileName);

            const dataObj = req.body;
            dataObj.imgURL = "uploads/" + req.file.filename;
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

export async function eventUserStatus(req: any, res: Response): Promise<void> {
    try {
        const event_id = req.body.event_id;
        const user_id = req.user;
        const eventUserResult = await eventUser.findOne({ user_id: user_id, event_id: event_id }, "status");
        res.json({status: eventUserResult?.status});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}