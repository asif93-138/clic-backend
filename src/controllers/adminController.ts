import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import EventCancellation from '../models/eventCancellation';
import CallHistory from '../models/callHistory';
import Matched from '../models/matched';
import WaitingRoom from '../models/waitingRoom';

const email = "admin@email.com";
const password = "admin";

export async function adminLogin(req: Request, res: Response): Promise<void> {
    try {
        if (req.body.email === email && req.body.password === password) {
            const token = generateToken({ id: `${email}:${password}` });
            res.status(200).json({ message: "Login successful", token });
        } else {
            res.status(400).json({ message: "Incorrect credentials" });
        }
    } catch (error) {
        console.error("Error in admin request:", error);
    }
}

export async function adminDataEvent(req: Request, res: Response) {
    const dataObj: { [key: string]: any } = {};
    const events = await Event.find({ date_time: { $lt: new Date().toISOString() } }, "title date_time event_durations") as Array<{ _id: any, title: string, date_time: any, event_durations: any }>;
    for (const event of events) {
        const pendingList = await eventUser.find({event_id: event._id, status: "pending"});
        const approvedList = await eventUser.find({event_id: event._id, status: "approved"});
        const attendees = await WaitingRoom.find({event_id: event._id, status: "inactive"});
        const attendeesM = await WaitingRoom.find({event_id: event._id, status: "inactive", gender: "M"});
        const attendeesF = await WaitingRoom.find({event_id: event._id, status: "inactive", gender: "F"});
        const cancelList = await EventCancellation.find({event_id: event._id});
        const callList = await CallHistory.find({event_id: event._id});
        const leftEarly = await CallHistory.find({event_id: event._id, left_early: true});
        const matchList = await Matched.find({event_id: event._id});
        const latestDoc = await WaitingRoom.findOne({ event_id: event._id })
            .sort({ updatedAt: -1 }) // Sort by updatedAt descending
            .select('updatedAt')     // Select only the updatedAt field
            .lean();

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
var counts: { [key: number]: number } = {};
matchList.forEach(x => {
    if (counts[x.count]) counts[x.count] = counts[x.count] + 1;
    else counts[x.count] = 1;
});
        dataObj[event._id] = {
            id: event._id, title: event.title, date_time: event.date_time, event_durations: event.event_durations,
            attendees: attendees.length, attendeesM: attendeesM.length, attendeesF: attendeesF.length,
            pending: pendingList.length, approved: approvedList.length, totalCancelled: cancelList.length,
            totalCall: callList.length, totalMatch: matchList.length, leftEarly: leftEarly.length, 
            lastExit: latestDoc?.updatedAt || null, approvedGenderC: genderCounts, 
            totalExts: matchList.reduce((x, y) => x + y.count, 0), noShows: (approvedList.length - attendees.length),
            matchCounts: counts
        };
    }
    res.json(dataObj);
}