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
    const arr = [];
    const events = await Event.find({}, "title date_time event_durations");
    for (const event of events) {
        const pendingList = await eventUser.find({event_id: event._id, status: "pending"});
        const approvedList = await eventUser.find({event_id: event._id, status: "approved"});
        const attendees = await WaitingRoom.find({event_id: event._id, status: "inactive"});
        const cancelList = await EventCancellation.find({event_id: event._id});
        const callList = await CallHistory.find({event_id: event._id});
        const leftEarly = await CallHistory.find({event_id: event._id, left_early: true});
        const matchList = await Matched.find({event_id: event._id});
        arr.push({
            id: event._id, title: event.title, date_time: event.date_time, event_durations: event.event_durations,
            attendees: attendees.length,
            pending: pendingList.length, approved: approvedList.length, totalCancelled: cancelList.length,
            totalCall: callList.length, totalMatch: matchList.length, leftEarly: leftEarly.length
        });
    }
    res.json(arr);
}