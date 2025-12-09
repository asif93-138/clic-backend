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
import WaitingRoom from '../models/waitingRoom';
import CallHistory from '../models/callHistory';
import FailedClic from '../models/failedClic';
import Matched from '../models/matched';
import invitations from '../models/invitations';
import { ObjectId } from 'mongodb';
import mongoose from "mongoose";
import InterestedMatch from '../models/interestedMatch';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../middleware/spaces';

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


export async function getAllEvents(req: Request, res: Response): Promise<void> {
  try {
    const result: any[] = [];
    const events: any = await Event.find();
    for (const event of events) {
      const dataObj: any = event.toObject(); // Convert Mongoose doc to plain object
      const pendingList = await eventUser.countDocuments({ event_id: event._id, status: "pending" });
      const approvedList = await eventUser.countDocuments({ event_id: event._id, status: "approved" });
      const waitingList = await eventUser.countDocuments({ event_id: event._id, status: "waiting" });

      const genderCounts = await getGenderCountsByEvent(event._id.toString());
      const cancelList = await EventCancellation.countDocuments({ event_id: event._id });
      dataObj.approvedGenderC = genderCounts;
      dataObj.pending = pendingList;
      dataObj.approved = approvedList;
      dataObj.waiting = waitingList;
      dataObj.totalCancelled = cancelList;
      result.push(dataObj);
    }
    res.json(result);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  try {
    const resultOld = await Event.findOne({ _id: req.params.id });
    const result: any = resultOld!.toObject();
    const genderCounts = await getGenderCountsByEvent(req.params.id);
    const cancelList = await EventCancellation.find({ event_id: req.params.id }, "user_id");
    const attendees = await WaitingRoom.countDocuments({ event_id: req.params.id });
    const attendeesM = await WaitingRoom.countDocuments({ event_id: req.params.id, gender: "M" });
    const attendeesF = await WaitingRoom.countDocuments({ event_id: req.params.id, gender: "F" });
    const callList = await CallHistory.countDocuments({ event_id: req.params.id });
    const failedClic = await FailedClic.countDocuments({ event_id: req.params.id });
    const matchList = await Matched.find({ event_id: req.params.id });
    const latestDoc = await WaitingRoom.findOne({ event_id: req.params.id })
      .sort({ updatedAt: -1 }) // Sort by updatedAt descending
      .select('updatedAt')     // Select only the updatedAt field
      .lean();
    const leftEarly = await CallHistory.countDocuments({ event_id: req.params.id, left_early: true });
    const invites = await invitations.find({ event_id: req.params.id }, "user_id status");
    var counts: { [key: number]: number } = {};
    matchList.forEach(x => {
      if (counts[x.count]) counts[x.count] = counts[x.count] + 1;
      else counts[x.count] = 1;
    });
    result.approvedGenderC = genderCounts;
    result.totalCancelled = cancelList.length;
    result.attendees = attendees;
    result.attendeesM = attendeesM;
    result.attendeesF = attendeesF;
    result.totalCall = callList;
    result.failedClic = failedClic;
    result.totalMatch = matchList.length;
    result.lastExit = latestDoc?.updatedAt || null;
    result.leftEarly = leftEarly;
    result.matchCounts = counts;
    result.totalExts = matchList.reduce((x, y) => x + y.count, 0);
    const newResult = await eventUser.find({ event_id: req.params.id }, "user_id status");
    const users = await User.find(
      { _id: { $in: [...newResult.map(x => x.user_id), ...cancelList.map(x => x.user_id), ...invites.map(x => x.user_id)] } },
      { password: 0, expoPushToken: 0 }
    );
    const invitationList = await User.find({
      _id: {
        $nin: [...newResult.map(x => x.user_id), ...cancelList.map(x => x.user_id), ...invites.map(x => x.user_id)].map(x => new mongoose.Types.ObjectId(x))
      }, approved: "approved"
    }, "userName email imgURL");
    const pending_members: any = []; const approved_members: any = []; const waiting_members: any = [];
    newResult.forEach(x => {
      if (x.status == 'approved') {
        for (const y of users) {
          if (y._id == x.user_id) {
            approved_members.push(x.user_id);
            break;
          }
        }
      } else if (x.status == 'pending') {
        for (const y of users) {
          if (y._id == x.user_id) {
            pending_members.push(x.user_id);
            break;
          }
        }
      } else {
        for (const y of users) {
          if (y._id == x.user_id) {
            waiting_members.push(x.user_id);
            break;
          }
        }
      }
    });
    result.noShows = (approved_members.length - attendees);
    const invited: any = {};
    invites.forEach(x => invited[x.user_id] = x);
    res.json({
      members: users, result, invited, approved_members, pending_members, waiting_members,
      invited_members: invites.map(x => x.user_id), cancelled_members: cancelList.map(x => x.user_id),
      invitationList
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function getEventForApp(req: any, res: Response): Promise<void> {
  try {
    const result = await Event.findOne({ _id: req.params.id });
    const status = await eventUser.findOne({event_id: req.params.id, user_id: req.user}, "status");
    const resultOld: any = result!.toObject();
    if (new Date() > new Date(resultOld?.date_time + ":00Z")) {
      const newResult = await eventUser.find({ event_id: req.params.id, status: "approved" }, "user_id");
      const users = await User.find({ _id: { $in: newResult.map(x => x.user_id) } }, "userName imgURL gender");
      resultOld!.participants = users;
      if (status) resultOld!.userStatus = status.status;
      else resultOld!.userStatus = result?.event_status === true ? "closed" : "new";
      res.json(resultOld);
    } else {
      if (status) resultOld!.userStatus = status.status;
      else resultOld!.userStatus = result?.event_status === true ? "closed" : "new";
       res.json(resultOld); 
    }

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
    //   {
    //     $lookup: {
    //       from: "eventusers",
    //       let: { eventId: "$_id" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $eq: ["$event_id", { $toString: "$$eventId" }] },
    //                 { $eq: ["$user_id", userId] },
    //               ],
    //             },
    //           },
    //         },
    //       ],
    //       as: "userEntries",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       hasPendingStatus: {
    //         $in: ["pending", "$userEntries.status"],
    //       },
    //       hasApprovedStatus: {
    //         $in: ["approved", "$userEntries.status"],
    //       },
    //       convertedDateTime: {
    //         $toDate: "$date_time"
    //       },
    //       dateTimeDifference: {
    //         $dateDiff: {
    //           startDate: new Date(),
    //           endDate: { $toDate: "$date_time" },
    //           unit: "day"
    //         }
    //       }
    //     },
    //   },
    //   {
    //     $match: {
    //       hasApprovedStatus: false,
    //       $expr: { $gte: [ "$dateTimeDifference", -7 ] }
    //     },
    //   },
    //   {
    //     $project: {
    //       title: 1,
    //       imgURL: 1,
    //       date_time: 1,
    //       userStatus: {
    //         $cond: [
    //           "$hasPendingStatus",
    //           "pending",
    //           "new",
    //         ],
    //       },
    //       createdAt: 1,
    //     },
    //   },
    //   { $sort: { createdAt: -1 } },
    //   { $skip: page * limit },
    //   { $limit: limit },
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
          hasWaitingStatus: {
            $in: ["waiting", "$userEntries.status"],
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
          $expr: { $gte: ["$dateTimeDifference", -7] }
        },
      },
      {
        $project: {
          title: 1,
          imgURL: 1,
          date_time: 1,
          userStatus: {
            $switch: {
              branches: [
                { case: "$hasPendingStatus", then: "pending" },
                { case: "$hasWaitingStatus", then: "waiting" },
              ],
              default: "new"
            }
          },
          event_status: 1,
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
      }, 'title imgURL date_time event_duration call_duration gate_closing').sort({ createdAt: -1 }).lean();
      const filteredArr: any[] = [];
      approvedResult.forEach((x: any) => {
        x.userStatus = "approved";
        filteredArr.push(x);
      })
      arr_2 = filteredArr;
    }

    const uCObj: any = {};
    upcomingEvents.forEach(x => {
      if (x.userStatus == "new" && x.event_status == true) x.userStatus = "closed";
      uCObj[x._id] = x;
    })
    const aPObj: any = {};
    arr_2.forEach(x => {
      aPObj[x._id] = x;
    })

    res.json({ approved: aPObj, upcoming: uCObj }); //  pending: arr_1,
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function createEvent(req: any, res: Response): Promise<void> {
  let createdEvent: any = "";
  try {

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const dataObj = req.body;
    const time_arr = JSON.parse(dataObj.event_durations);
    dataObj.imgURL = req.file.cdnUrl;
    dataObj.event_duration = time_arr[1];
    dataObj.call_duration = time_arr[0];
    dataObj.gate_closing = time_arr[2];
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
  //       sendEmail(
  //         user.email,
  //         'New pool created!',
  //         `Hello ${user.userName}, New pool arrived for you!`,
  //         `<h1>Hello ${user.userName}</h1> <p>Check your upcoming pools!</p>`
  //       );
  //     });
  //     scheduleJob("send push notification", req.body.date_time, {eventId: createdEvent._id});
  // });
}

export async function applyEvent(req: any, res: Response): Promise<void> {
  try {
    const { eventId, userStatus } = req.body;
    let status: "new" | "closed" | "waiting" | "pending" | "approved" | string | undefined;
    const invitationCheck = await invitations.findOne({ event_id: eventId, user_id: req.user });
    const dataObj_1 = { event_id: eventId, user_id: req.user, userStatus, status };
    // Edgecase: Stale data from userStatus
    if (userStatus == "new" || userStatus == "closed") {
      const poolStatusCheck = await Event.findOne({ _id: eventId }, "event_status");
      if (poolStatusCheck?.event_status === true && userStatus == "new") dataObj_1.userStatus = "closed";
      if (poolStatusCheck?.event_status === false && userStatus == "closed") dataObj_1.userStatus = "new";
    }
    //

    // refactor:switch case
    if (dataObj_1.userStatus === 'new') {
      if (invitationCheck) {
        dataObj_1.status = 'approved';
        const insertResult = await eventUser.create(dataObj_1);
        if (insertResult._id) {
          await invitations.findByIdAndUpdate(invitationCheck._id, { status: "accepted" });
          await EventCancellation.deleteOne({ event_id: dataObj_1.event_id, user_id: dataObj_1.user_id });
          res.json({ userStatus: dataObj_1.status });
        } else {
          res.status(400).json({ message: "failed!" });
        }
      } else {
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
          await EventCancellation.deleteOne({ event_id: dataObj_1.event_id, user_id: dataObj_1.user_id });
          res.json({ userStatus: dataObj_1.status });
        } else {
          res.status(400).json({ message: "failed!" });
        }
      }
    } else if (dataObj_1.userStatus === 'closed') {
      if (invitationCheck) {
        dataObj_1.status = 'approved';
        const insertResult = await eventUser.create(dataObj_1);
        if (insertResult._id) {
          await invitations.findByIdAndUpdate(invitationCheck._id, { status: "accepted" });
          await EventCancellation.deleteOne({ event_id: dataObj_1.event_id, user_id: dataObj_1.user_id });
          res.json({ userStatus: dataObj_1.status });
        } else {
          res.status(400).json({ message: "failed!" });
        }
      } else {
        dataObj_1.status = 'waiting';
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
          await EventCancellation.deleteOne({ event_id: dataObj_1.event_id, user_id: dataObj_1.user_id });
          res.json({ userStatus: dataObj_1.status });
        } else {
          res.status(400).json({ message: "failed!" });
        }
      }
    } else if (dataObj_1.userStatus === 'waiting') {
      res.status(400).json({ message: "invalid request!" });
    } else if (dataObj_1.userStatus === 'pending') {
      res.status(400).json({ message: "invalid request!" });
    } else if (dataObj_1.userStatus === 'approved') {
      const deleteResult = await eventUser.deleteOne({
        user_id: dataObj_1.user_id,
        event_id: dataObj_1.event_id
      });

      const filter = { event_id: dataObj_1.event_id, user_id: dataObj_1.user_id };

      const update = {
        $inc: { count: 1 },  // increment count by 1
        $setOnInsert: { cancelledBy: 'user' }  // set other fields only if inserted
      };

      const options = {
        upsert: true,   // create if doesn't exist
        new: true       // return the updated/new document
      };
      const cancelInsertion = await EventCancellation.findOneAndUpdate(filter, update, options);
      if (invitationCheck) await invitations.findByIdAndUpdate(invitationCheck._id, { status: "rejected" });
      if (deleteResult.acknowledged && cancelInsertion) {
        const poolStatusCheck = await Event.findOne({ _id: eventId }, "event_status");
        if (poolStatusCheck?.event_status === true) status = "closed";
        else status = "new";
        res.json({ userStatus: status });
      } else {
        res.status(400).json({ message: "failed!" });
      }
    } else {
      res.status(400).json({ message: "invalid user status!" });
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
      await notification.updateMany({type: "rsvp", "data.event_id": dataObj_1.event_id}, {read: true});
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
    const eventUserResult = await eventUser.deleteOne({
      user_id: req.body.user_id,
      event_id: req.body.event_id
    });
    if (eventUserResult.acknowledged) {
      await invitations.deleteOne({event_id: req.body.event_id, user_id: req.body.user_id})
      res.json({ message: "Successfully removed user!" });
    } else {
      res.status(400).json({ message: "failed!" });
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function updateEvent(req: any, res: Response): Promise<void> {

  try {
    if (!req.params || !req.params.id) {
      res.status(400).json({ message: 'Event ID is required' });
      return;
    }

    if (req.file) {

      await s3.send(
        new DeleteObjectCommand({
          Bucket: "twoclicclub",
          Key: req.body.imgURL,
        })
      );

      const dataObj = req.body;
      dataObj.imgURL = req.file.cdnUrl;
      const time_arr = JSON.parse(dataObj.event_durations);
      dataObj.event_duration = time_arr[1];
      dataObj.call_duration = time_arr[0];
      dataObj.gate_closing = time_arr[2];
      dataObj.extension_limit = Number(dataObj.extension_limit);
      dataObj.event_status = dataObj.event_status == "true" ? true : false;
      const result = await Event.findByIdAndUpdate(req.params.id, dataObj);
      res.json(result);
    } else {
      const dataObj = req.body;
      const time_arr = JSON.parse(dataObj.event_durations);
      dataObj.event_duration = time_arr[1];
      dataObj.call_duration = time_arr[0];
      dataObj.gate_closing = time_arr[2];
      dataObj.extension_limit = Number(dataObj.extension_limit);
      dataObj.event_status = dataObj.event_status == "true" ? true : false;
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
    if (!eventUserResult) {
      const event = await Event.findOne({ _id: req.params.id }, "event_status");
      res.json({ status: event?.event_status === true ? "join waitlist" : "join" });
    } else { res.json({ status: eventUserResult?.status }); }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function eventUserStatusAdmin(req: Request, res: Response): Promise<void> {
  try {
    const event_id = req.query.event_id;
    const user_id = req.query.user_id;
    const eventUserResult = await eventUser.findOne({ user_id: user_id, event_id: event_id }, "status");
    res.json({ status: eventUserResult?.status });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export async function uploadTesting(req: Request, res: Response) {
  res.status(200).json({ file: (req.file as any)?.cdnUrl });
}

export async function deletePhoto(req: Request, res: Response) {
  try {
    const bucket = "twoclicclub";
    const key = req.body.imgURL;
    
    const result = await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
   
    res.json({ message: "Deleted successfully" });
  }
  catch (error) {
    console.error("error deleting photo", error);
    res.status(500).json({ message: "Delete error" });
  }
}

export async function homePageData(req: any, res: Response) {
  const result = await getApprovedOppositeGenderUsersInFutureEvents(req.user);
  res.json(result);
}

export async function getApprovedOppositeGenderUsersInFutureEvents(user_id: string) {
  const requestingObjectId = new Types.ObjectId(user_id);

  // 1) Find requesting user's gender
  const requestingUser = await User.findById(requestingObjectId)
    .select("gender")
    .lean();

  if (!requestingUser) throw new Error("Requesting user not found.");

  const oppositeGender =
    requestingUser.gender.toLowerCase() === "male" ? "Female" : "Male";

  // 2) Get events the user already joined
  const joinedDocs = await eventUser.find({ user_id }).select("event_id").lean();
  const joinedEventIds = joinedDocs.map((d) => d.event_id);

  const nowDate = new Date();

  // 3) AGGREGATION: get all future events with opposite-gender members
  const events = await eventUser.aggregate([
    {
      $match: {
        status: "approved",
        event_id: { $nin: joinedEventIds },
      },
    },
    {
      $addFields: {
        userObjectId: { $toObjectId: "$user_id" },
        eventObjectId: { $toObjectId: "$event_id" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userObjectId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.gender": oppositeGender,
      },
    },
    {
      $lookup: {
        from: "events",
        localField: "eventObjectId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
    {
      $match: {
        $expr: {
          $gt: [
            {
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
    {
      $group: {
        _id: "$event._id",
        title: { $first: "$event.title" },
        date_time: { $first: "$event.date_time" },
        event_status: { $first: "$event.event_status" },
        members: { $push: "$user_id" }, // ONLY userIDs
      },
    },
    {
      $project: {
        _id: 0,
        event_id: "$_id",
        title: 1,
        date_time: 1,
        event_status: 1,
        members: 1,
      },
    },
    { $sort: { date_time: 1 } },
  ]);

  // 4) Collect all unique user_ids from all events
  const uniqueUserIds = [
    ...new Set(events.flatMap((event) => event.members)),
  ];

  // 5) Fetch those users
  const peopleData = await User.find({ _id: { $in: uniqueUserIds } })
    .select("userName imgURL gender")
    .lean();

  // 6) Add interest field
  const people = await Promise.all(
    peopleData.map(async (p: any) => {
      const likedCheck = await InterestedMatch.findOne({
        liked: p._id.toString(),
        likedBy: user_id,
      });

      return {
        userID: p._id.toString(),
        userName: p.userName,
        imgURL: p.imgURL,
        gender: p.gender,
        interest: !!likedCheck, // true if found
      };
    })
  );

  // 7) final output
  return {
    card: events,
    people,
  };
}

// export async function getApprovedOppositeGenderUsersInFutureEvents(user_id: string) {
//   // 0) Convert the incoming user_id (string) into an ObjectId
//   const requestingObjectId = new Types.ObjectId(user_id);

//   // 1) Look up gender of the requesting user, so we know the “opposite” gender
//   const requestingUser = await User.findById(requestingObjectId)
//     .select("gender")
//     .lean();
//   if (!requestingUser) {
//     throw new Error("Requesting user not found.");
//   }
//   const oppositeGender =
//     requestingUser.gender.toLowerCase() === "male" ? "Female" : "Male";

//   // 2) Gather all event_ids (strings) that this user has already joined
//   //    (EventUser.event_id is stored as a string in our schema)
//   const joinedDocs = await eventUser.find({ user_id: user_id })
//     .select("event_id")
//     .lean();
//   const joinedEventIds: string[] = joinedDocs.map((doc) => doc.event_id);

//   // 3) Prepare “now” for comparison (string form is fine, but we’ll use it in a Date literal below)
//   const nowDate = new Date(); // current UTC time

//   // 4) Build the aggregation pipeline on EventUser
//   const result = await eventUser.aggregate([
//     // ─── Stage 1 ───
//     // Only look at “approved” records in EventUser, and exclude any event_id that
//     // the requesting user has already joined.
//     {
//       $match: {
//         status: "approved",
//         event_id: { $nin: joinedEventIds },
//       },
//     },

//     // ─── Stage 2 ───
//     // We need to convert both user_id and event_id (stored as strings) into actual ObjectIds
//     // before doing $lookup against “users” (which has _id:ObjectId) and “events” (which has _id:ObjectId).
//     {
//       $addFields: {
//         userObjectId: { $toObjectId: "$user_id" },
//         eventObjectId: { $toObjectId: "$event_id" },
//       },
//     },

//     // ─── Stage 3 ───
//     // Join in the “users” collection by matching userObjectId → _id
//     {
//       $lookup: {
//         from: "users",
//         localField: "userObjectId",
//         foreignField: "_id",
//         as: "user",
//       },
//     },
//     { $unwind: "$user" },

//     // ─── Stage 4 ───
//     // Only keep those users whose gender is the opposite of the requesting user
//     {
//       $match: {
//         "user.gender": oppositeGender,
//       },
//     },

//     // ─── Stage 5 ───
//     // Join in the “events” collection by matching eventObjectId → _id
//     {
//       $lookup: {
//         from: "events",
//         localField: "eventObjectId",
//         foreignField: "_id",
//         as: "event",
//       },
//     },
//     { $unwind: "$event" },

//     // ─── Stage 6 ───
//     // Filter to only “future” events.  event.date_time is stored as a string like "2025-08-25T16:00",
//     // so we must parse it into a Date to compare to “nowDate” (current UTC).
//     {
//       $match: {
//         $expr: {
//           $gt: [
//             {
//               // Convert the ISO‐style string "YYYY‐MM‐DDTHH:mm" into a Date (UTC)
//               $dateFromString: {
//                 dateString: "$event.date_time",
//                 timezone: "UTC",
//               },
//             },
//             nowDate,
//           ],
//         },
//       },
//     },

//     // ─── Stage 7 ───
//     // Finally, project exactly the fields we want:
//     //   userName, imgURL, gender (from the “user” object)
//     //   event_id, title, date_time (from the “event” object)
//     {
//       $project: {
//         _id: 0,
//         userName: "$user.userName",
//         imgURL: "$user.imgURL",
//         gender: "$user.gender",
//         event_id: "$event._id",    // this will be an ObjectId
//         title: "$event.title",
//         date_time: "$event.date_time",
//         event_status: "$event.event_status",
//       },
//     },
//   ]);
//   console.log(result);
//   return result;
// }

export const getFutureEvents = async (req: Request, res: Response) => {
  const nowUTCString = new Date().toISOString().slice(0, 16); // e.g., '2025-07-29T10:30'

  try {
    const futureEvents = await Event.find({
      date_time: { $gt: nowUTCString },
    })
      .sort({ createdAt: -1 }) // ✅ Correct way to sort
      .select("title imgURL description date_time location")
      .exec();

    res.json(futureEvents);
  } catch (err) {
    console.log("Failed to fetch future events: " + err);
    res.status(500).json(err);
  }
};
export const getWaitingList = async (req: Request, res: Response) => {
  try {
    const events = await Event.find({
      date_time: { $gt: new Date().toISOString().slice(0, 16) }, _id: { $ne: new ObjectId(req.params.id) }
    }).select("title date_time").exec();
    const eventUsers = await eventUser.find({ event_id: { $in: events.map((x: any) => x._id.toString()) }, status: "waiting" }, "user_id event_id");
    const users = await User.find({ _id: { $in: eventUsers.map(x => x.user_id) } }, "userName imgURL gender");
    const WaitingList: any = [];
    eventUsers.forEach(x => {
      const dataItem: any = {};
      dataItem.event_id = x.event_id;
      dataItem.user_id = x.user_id;
      for (const y of users) {
        // Ensure y._id is treated as a string or ObjectId
        if (typeof y._id === "string" || (typeof y._id === "object" && y._id !== null && "toString" in y._id)) {
          if (y._id.toString() == x.user_id) {
            dataItem.userName = y.userName; dataItem.imgURL = y.imgURL; dataItem.gender = y.gender;
            break;
          }
        }
      }
      for (const y of events) {
        // Ensure y._id is treated as a string or ObjectId
        if (typeof y._id === "string" || (typeof y._id === "object" && y._id !== null && "toString" in y._id)) {
          if (y._id.toString() == x.event_id) {
            dataItem.title = y.title; dataItem.date_time = y.date_time;
            break;
          }
        }
      }
      WaitingList.push(dataItem);
    });
    res.json(WaitingList);
  } catch (err) {
    console.log("Failed to fetch waiting list: " + err);
    res.status(500).json(err);
  }
};

export async function sendBulkInvitations(req: Request, res: Response) {
  try {
    req.body.users.forEach((x: { email: any; fullName: any; }) => {
      sendEmail(
        x.email,
        "Clic Club invitation",
        'New pool created!',
        `<h1>Hello ${x.fullName}</h1> <p>You'r invited to ${req.body.eventTitle} pool!</p> <p>Go to https://clicclub.cc/ to join.</p>`
      );
    })
    res.send("OK");
  } catch (err) {
    console.log("Failed to send bulk invitations: ", err);
    res.status(500).json(err);
  }
}