
import EventUser from "../../../models/eventUser";
import { memoryStore } from "../memoryStore/memoryStore";

export default async function rsvpPairs() {
    const userIDs =  Object.keys(memoryStore.users);
    const eventUserArr = userIDs.map(userID => ({event_id: memoryStore.event.eventId, user_id: userID, status: "approved"}));
    const result = await EventUser.create(eventUserArr);

    // Assertion
    expect(result.length).toBe(userIDs.length)
}