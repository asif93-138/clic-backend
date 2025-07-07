import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';
import Event from '../models/event';
import eventUser from '../models/eventUser';
import EventCancellation from '../models/eventCancellation';
import CallHistory from '../models/callHistory';
import Matched from '../models/matched';
import WaitingRoom from '../models/waitingRoom';
import FailedClic from '../models/failedClic';

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
    const events = await Event.find({ date_time: { $lt: new Date().toISOString() } }, "") as Array<{ _id: any, title: string, date_time: any, event_durations: any }>;
    for (const event of events) {
        const approvedList = await eventUser.find({event_id: event._id, status: "approved"});
        const attendees = await WaitingRoom.find({event_id: event._id, status: "inactive"});
        const attendeesM = await WaitingRoom.find({event_id: event._id, status: "inactive", gender: "M"});
        const attendeesF = await WaitingRoom.find({event_id: event._id, status: "inactive", gender: "F"});
        const cancelList = await EventCancellation.find({event_id: event._id});
        const callList = await CallHistory.find({event_id: event._id});
        const leftEarly = await CallHistory.find({event_id: event._id, left_early: true});
        const matchList = await Matched.find({event_id: event._id});
        const failedClic = await FailedClic.find({event_id: event._id});
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
            id: event._id, attendees: attendees.length, attendeesM: attendeesM.length, 
            attendeesF: attendeesF.length, approved: approvedList.length, totalCancelled: cancelList.length,
            totalCall: callList.length, totalMatch: matchList.length, leftEarly: leftEarly.length, 
            failedClic: failedClic.length, lastExit: latestDoc?.updatedAt || null,
            totalExts: matchList.reduce((x, y) => x + y.count, 0), noShows: (approvedList.length - attendees.length),
            matchCounts: counts
        };
    }
    res.json(dataObj);
}