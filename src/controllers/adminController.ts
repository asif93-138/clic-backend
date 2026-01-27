import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import CallHistory from '../models/callHistory';
import Matched from '../models/matched';
import WaitingRoom from '../models/waitingRoom';
import FailedClic from '../models/failedClic';
import User from '../models/user.model';
import DateFeedback from '../models/dateFeedback';
import notification from '../models/notification';
import invitations from '../models/invitations';

const userName = "sarahzmahmud";
const password = "Fullm00n2025!";

export async function adminLogin(req: Request, res: Response): Promise<void> {
    try {
        if (req.body.userName === userName && req.body.password === password) {
            const token = generateToken({ id: `${userName}:${password}` });
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
    const events = await Event.find({ date_time: { $lt: new Date().toISOString() } }, "") as Array<{ _id: any, title: string, date_time: any }>;
    for (const event of events) {
        const approvedList = await eventUser.countDocuments({event_id: event._id, status: "approved"});
        const attendees = await WaitingRoom.countDocuments({event_id: event._id});
        const attendeesM = await WaitingRoom.countDocuments({event_id: event._id, gender: "M"});
        const attendeesF = await WaitingRoom.countDocuments({event_id: event._id, gender: "F"});
        const callList = await CallHistory.countDocuments({event_id: event._id});
        const leftEarly = await CallHistory.countDocuments({event_id: event._id, left_early: true});
        const matchList = await Matched.find({event_id: event._id});
        const failedClic = await FailedClic.countDocuments({event_id: event._id});
        const latestDoc = await WaitingRoom.findOne({ event_id: event._id })
            .sort({ updatedAt: -1 }) // Sort by updatedAt descending
            .select('updatedAt')     // Select only the updatedAt field
            .lean();

var counts: { [key: number]: number } = {};
matchList.forEach(x => {
    if (counts[x.count]) counts[x.count] = counts[x.count] + 1;
    else counts[x.count] = 1;
});
        dataObj[event._id] = {
            id: event._id, attendees: attendees, attendeesM: attendeesM, 
            attendeesF: attendeesF, approved: approvedList,
            totalCall: callList, totalMatch: matchList.length, leftEarly: leftEarly, 
            failedClic: failedClic, lastExit: latestDoc?.updatedAt || null,
            totalExts: matchList.reduce((x, y) => x + y.count, 0), noShows: (approvedList - attendees),
            matchCounts: counts
        };
    }
    res.json(dataObj);
}

export async function adminEventDetails(req: Request, res: Response) {
    const attendees = await WaitingRoom.find({event_id: req.params.id}, "user_id");
    const arr: string[] = [];
    attendees.forEach(x => arr.push(x.user_id));
    const users = await User.find({ _id : { $in: arr } }, "userName imgURL gender city") as Array<{ _id: string, userName: string, imgURL: string, gender: string, city: string }>;
    const callList = await CallHistory.find({event_id: req.params.id});
    const feedBacks = await DateFeedback.find({event_id: req.params.id});
    const failedClics = await FailedClic.find({event_id: req.params.id});
    const matchList = await Matched.find({event_id: req.params.id});
    const userData:any = {};
    const userArr:any = [];
    arr.forEach((x: any) => {
        for (const y of users) {
            if (y._id.toString() == x) {
                userData[x] = y;
                userArr.push(y);
                break;
            }
        }
    });
    const callData: any = [];
    callList.forEach(call => {
        const data:any = call.toObject();
        if (call.dateRoomDocId == matchList[0]?.dateRoomDocId) {
            data.matchCount = matchList[0].count;
            matchList.shift();
        }
        if (call.dateRoomDocId == failedClics[0]?.dateRoomDocId) {
            data.failedClic = failedClics[0].requested;
            failedClics.shift();
        }
        if (call.dateRoomDocId == feedBacks[0]?.dateRoomDocId) {
            data.feedBack = [feedBacks[0]];
            feedBacks.shift();
            if (call.dateRoomDocId == feedBacks[0]?.dateRoomDocId) {
                data.feedBack = [...data.feedBack, feedBacks[0]];
                feedBacks.shift();
            }
        }
        callData.push(data);
    });
    res.json({userData, userArr, callData});
}

export async function notificationCount(req: Request, res: Response) {
    const notificationCount = await notification.countDocuments({read: false});
    res.json({notificationCount});
}
export async function getAllNotifications(req: Request, res: Response) {
    const notifications = await notification.find({});
    res.json(notifications);
}

export async function readNotification(req: Request, res: Response) {
    const notificationRead = await notification.findByIdAndUpdate(req.params.id, {read: true});
    res.json(notificationRead);
}
export async function deleteUnreadNotifications(req: Request, res: Response) {
    const deleted = await notification.deleteMany({read: true});
    res.json(deleted);
}

export async function registerInvites(req: Request, res: Response) {
    try {
        const inviteResult = await invitations.create(req.body);
        res.json(inviteResult);
    }
    catch (error) {
        console.log("Error in registerInvites:", error);
        res.status(500).json(error)
    }
}

// (async function () {
//     const inviteResult = await invitations.create({
//         event_id: "695a91704e807ff62c858e92", title: "Test Event", user_id: "695a91704e807ff62c858e89", 
//         userName: "User-M 1", user_imgURL: "uploads/1765377068784-880713060.jpeg", status: "invited"
//     });
//         console.log(inviteResult);
// })()
