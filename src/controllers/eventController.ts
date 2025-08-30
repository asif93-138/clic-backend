import { Request, Response } from 'express';
import fs from 'fs';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import User from '../models/user.model';
import sendPushNotificationNow from '../utils/sendPushNotificationNow';
import { scheduleJob } from '../utils/scheduler';
import { Types } from "mongoose";
import EventCancellation from '../models/eventCancellation';
import { sendEmail } from '../utils/sendEmail';
import notification from '../models/notification';
import cloudinary from '../utils/cloudinary';




export async function getAllEvents(req: Request, res: Response): Promise<void> {
    try {
        const result: any[] = [];
        const events: any = await Event.find();
        for (const event of events) {
          const dataObj: any = event.toObject(); // Convert Mongoose doc to plain object
          const pendingList = await eventUser.find({event_id: event._id, status: "pending"});
          const approvedList = await eventUser.find({event_id: event._id, status: "approved"});
          const getGenderCountsByEvent = async (eventId: string) => {
  const result = await eventUser.aggregate([
    // 1) Match only the approved EventUser docs for the given event_id
    {
      $match: {
        event_id: eventId,
        status: "approved",
      },
    },

    // 2) Do a lookup into "users", converting user_id (string) → ObjectId
    {
      $lookup: {
        from: "users", // MongoDB collection name for your User model
        let: { uid_str: "$user_id" },
        pipeline: [
          {
            // Convert the EventUser.user_id string into an ObjectId to compare with User._id
            $match: {
              $expr: {
                $eq: [
                  "$_id",
                  { $toObjectId: "$$uid_str" },
                ],
              },
            },
          },
          {
            // Only pull in the gender field (we don’t need the entire user document)
            $project: { gender: 1 },
          },
        ],
        as: "user_docs",
      },
    },

    // 3) Unwind so that each EventUser now has a single `user_docs` sub‐document
    {
      $unwind: "$user_docs",
    },

    // 4) Group by user_docs.gender and count
    {
      $group: {
        _id: "$user_docs.gender",
        count: { $sum: 1 },
      },
    },
  ]);

  // Format the aggregation result into a { Male: X, Female: Y } object
  const counts = { Male: 0, Female: 0 };
  result.forEach((doc) => {
    if (doc._id === "Male") counts.Male = doc.count;
    if (doc._id === "Female") counts.Female = doc.count;
  });

  return counts;
};
const genderCounts = await getGenderCountsByEvent(event._id.toString());
const cancelList = await EventCancellation.find({event_id: event._id});
          dataObj.approvedGenderC = genderCounts;
          dataObj.pending = pendingList.length;
          dataObj.approved = approvedList.length;
          dataObj.totalCancelled = cancelList.length;
          result.push(dataObj);
        }
        res.json(result);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function getEvent(req: Request, res: Response): Promise<void> {
    try {
        const result = await Event.findOne({ _id: req.params.id });
        const newResult = await eventUser.find({ event_id: req.params.id });
        const users = await User.find({ _id: { $in: newResult.map(x => x.user_id) } }, { password: 0, expoPushToken: 0 });
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
    let createdEvent:any = "";
    try {

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // http://localhost:5000/uploads/1747643112457-930576226.jpg
       
        const dataObj = req.body;
        dataObj.event_durations = JSON.parse(dataObj.event_durations);
        dataObj.imgURL = "uploads/" + req.file.filename;
        dataObj.cloud_imgURL = req.file.cloudinaryUrl;
        dataObj.extension_limit = Number(dataObj.extension_limit);
        const insertResult = await Event.create(dataObj);
        createdEvent = insertResult;
        res.json(insertResult);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
  //     res.on('finish', async () => {
  //     const users = await User.find({}).select('email userName expoPushToken');

  //     users.map(async(user)=>{
  //       if (user.expoPushToken) sendPushNotificationNow(user.expoPushToken, `New event has been created: ${req.body.title}`, `Join NOW!`);
  //       if (user.email == "asif93@student.sust.edu" || user.email == "mahir.tasin.dev@gmail.com") {
  //       sendEmail(
  //         user.email,
  //         'New pool created!',
  //         `Hello ${user.userName}, New pool arrived for you!`, 
  //         `<h1>Hello ${user.userName}</h1> <p>Check your upcoming pools!</p>`
  //       );
  //       }
  //     });
  //     scheduleJob("send push notification", req.body.date_time, {eventId: createdEvent._id});
  // });
}

export async function applyEvent(req: any, res: Response): Promise<void> {
    try {
        const { eventId, btnTxt, status } = req.body;
        const dataObj_1 = { event_id: eventId, user_id: req.user, btnTxt, status };
        if (dataObj_1.btnTxt === 'join') {
            dataObj_1.status = 'pending';
            const insertResult = await eventUser.create(dataObj_1);
            if (insertResult._id) {
                        const eventData = await Event.findById(eventId, 'title');
                        const userData = await User.findById(req.user, 'userName');
                        const notificationData = new notification({
                            type: "rsvp",
                            data: {
                                event_id: eventId,
                                user_id: req.user,
                                eventTitle: eventData?.title,
                                userName: userData?.userName
                            }
                        });
                        await notificationData.save();
                res.json({ btnTxt: 'pending' });
            } else {
                res.status(400).json({ message: "failed!" });
            }
        } else {
            const deleteResult = await eventUser.deleteOne({
                user_id: dataObj_1.user_id,
                event_id: dataObj_1.event_id
            });

            const filter = {event_id: dataObj_1.event_id, user_id: dataObj_1.user_id};

            const update = {
              $inc: { count: 1 },  // increment count by 1
              $setOnInsert: { cancelledBy: 'user' }  // set other fields only if inserted
            };

            const options = {
                  upsert: true,   // create if doesn't exist
                  new: true       // return the updated/new document
            };

            const cancelInsertion = await EventCancellation.findOneAndUpdate(filter, update, options);

            if (deleteResult.acknowledged && cancelInsertion) {
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

export async function rejectEventUser(req: Request, res: Response): Promise<void> {
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

            // Delete previous file from local storage
            fs.unlinkSync(req.file.destination + "\\" + req.body.deleteFileName);

            // Delete previous file from cloud
            const parts = req.body.cloud_imgURL.split("/");
            const fileWithExt = parts.slice(-2).join("/"); // "my_app_uploads/abc123.png"
            await cloudinary.uploader.destroy(fileWithExt.replace(/\.[^/.]+$/, ""));

            const dataObj = req.body;
            dataObj.imgURL = "uploads/" + req.file.filename;
            dataObj.cloud_imgURL = req.file.cloudinaryUrl;
            dataObj.event_durations = JSON.parse(dataObj.event_durations);
            dataObj.extension_limit = Number(dataObj.extension_limit);
            const result = await Event.findByIdAndUpdate(req.params.id, dataObj);
            res.json(result);
        } else {
            const dataObj = req.body;
            dataObj.event_durations = JSON.parse(dataObj.event_durations);
            dataObj.extension_limit = Number(dataObj.extension_limit);
            const result = await Event.findByIdAndUpdate(req.params.id, dataObj);
            res.json(result);
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function eventUserStatus(req: any, res: Response): Promise<void> {
    try {
        const event_id = req.params.id;
        const user_id = req.user;
        const eventUserResult = await eventUser.findOne({ user_id: user_id, event_id: event_id }, "status");
        res.json({status: eventUserResult?.status});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function eventUserStatusAdmin(req: Request, res: Response): Promise<void> {
    try {
        const event_id = req.query.event_id;
        const user_id = req.query.user_id;
        const eventUserResult = await eventUser.findOne({ user_id: user_id, event_id: event_id }, "status");
        res.json({status: eventUserResult?.status});
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export async function uploadTesting(req: Request, res: Response) {
    console.log(req.file);
    res.status(200).json({file: req.file});
}

export async function deletePhoto(req: any, res: Response) {
  try {
    // I:\\clic-server\\uploads\\1756195343323-356631876.jpg
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/my_app_uploads/abc123.png
    const parts = req.body.cloud_imgURL.split("/");
    const fileWithExt = parts.slice(-2).join("/"); // "my_app_uploads/abc123.png"
    await cloudinary.uploader.destroy(fileWithExt.replace(/\.[^/.]+$/, ""));
    fs.unlinkSync(req.body.file_path);
    res.status(200).send("deleted!");
  }
  catch (error) {
    console.error("Cloudinary error", error);
  }
}

export async function homePageData(req: any, res: Response) {
    const result = await getApprovedOppositeGenderUsersInFutureEvents(req.user);
    res.json(result);
}

export async function getApprovedOppositeGenderUsersInFutureEvents(user_id: string) {
  // 0) Convert the incoming user_id (string) into an ObjectId
  const requestingObjectId = new Types.ObjectId(user_id);

  // 1) Look up gender of the requesting user, so we know the “opposite” gender
  const requestingUser = await User.findById(requestingObjectId)
    .select("gender")
    .lean();
  if (!requestingUser) {
    throw new Error("Requesting user not found.");
  }
  const oppositeGender =
    requestingUser.gender.toLowerCase() === "male" ? "Female" : "Male";

  // 2) Gather all event_ids (strings) that this user has already joined
  //    (EventUser.event_id is stored as a string in our schema)
  const joinedDocs = await eventUser.find({ user_id: user_id })
    .select("event_id")
    .lean();
  const joinedEventIds: string[] = joinedDocs.map((doc) => doc.event_id);

  // 3) Prepare “now” for comparison (string form is fine, but we’ll use it in a Date literal below)
  const nowDate = new Date(); // current UTC time

  // 4) Build the aggregation pipeline on EventUser
  const result = await eventUser.aggregate([
    // ─── Stage 1 ───
    // Only look at “approved” records in EventUser, and exclude any event_id that
    // the requesting user has already joined.
    {
      $match: {
        status: "approved",
        event_id: { $nin: joinedEventIds },
      },
    },

    // ─── Stage 2 ───
    // We need to convert both user_id and event_id (stored as strings) into actual ObjectIds
    // before doing $lookup against “users” (which has _id:ObjectId) and “events” (which has _id:ObjectId).
    {
      $addFields: {
        userObjectId: { $toObjectId: "$user_id" },
        eventObjectId: { $toObjectId: "$event_id" },
      },
    },

    // ─── Stage 3 ───
    // Join in the “users” collection by matching userObjectId → _id
    {
      $lookup: {
        from: "users",
        localField: "userObjectId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // ─── Stage 4 ───
    // Only keep those users whose gender is the opposite of the requesting user
    {
      $match: {
        "user.gender": oppositeGender,
      },
    },

    // ─── Stage 5 ───
    // Join in the “events” collection by matching eventObjectId → _id
    {
      $lookup: {
        from: "events",
        localField: "eventObjectId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },

    // ─── Stage 6 ───
    // Filter to only “future” events.  event.date_time is stored as a string like "2025-08-25T16:00",
    // so we must parse it into a Date to compare to “nowDate” (current UTC).
    {
      $match: {
        $expr: {
          $gt: [
            {
              // Convert the ISO‐style string "YYYY‐MM‐DDTHH:mm" into a Date (UTC)
              $dateFromString: {
                dateString: "$event.date_time",
                timezone: "UTC",
              },
            },
            nowDate,
          ],
        },
      },
    },

    // ─── Stage 7 ───
    // Finally, project exactly the fields we want:
    //   userName, imgURL, gender (from the “user” object)
    //   event_id, title, date_time (from the “event” object)
    {
      $project: {
        _id: 0,
        userName: "$user.userName",
        imgURL: "$user.imgURL",
        gender: "$user.gender",
        event_id: "$event._id",    // this will be an ObjectId
        title: "$event.title",
        date_time: "$event.date_time",
      },
    },
  ]);

  return result;
}

export const getFutureEvents = async (req : Request, res: Response) => {
  const nowUTCString = new Date().toISOString().slice(0, 16); // e.g., '2025-07-29T10:30'

  try {
    const futureEvents = await Event.find({
      date_time: { $gt: nowUTCString }
    }).select("title imgURL description date_time location").exec();
    
    res.json(futureEvents);
  } catch (err) {
    console.log("Failed to fetch future events: " + err);
    res.status(500).json(err);
  }
};