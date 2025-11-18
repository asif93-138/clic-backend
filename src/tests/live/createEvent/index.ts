import Event from "../../../models/event";
import { memoryStore } from "../memoryStore/memoryStore";

function formatToYMDHM(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // UTC month
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

export default async function createEvent(title: string) {
    const result = await Event.create({
        title: title,
        imgURL: "uploads/banner-5.png",
        cloud_imgURL: "default",
        description: "default",
        date_time: formatToYMDHM(new Date()),
        location: "Dhaka",
        event_status: false,
        event_durations: [60, 180],
        extension_limit: 3
    });
    memoryStore.event = { eventId: result._id?.toString() ?? "", title: title, startTime: result.date_time };
    expect(await Event.countDocuments()).toBe(1);
}