// import { createBulkUsers } from "./createUsers/";
// import { createEvent } from "./createEvent/";
// import { rsvpPairs } from "./rsvpUsers/";
// import { setEventTimeNow } from "./setEventTime/";
// import { joinLive } from "./joinLive/";
// import { memoryStore } from "./memoryStore/";

// describe("Live Feature Workflow", () => {

//   // Step 1: Create users
//   it("should create N users (half male, half female)", async () => {
//     await createBulkUsers(10); // creates users and stores in memory
//     console.log("Users created:", memoryStore.users.length);
//   });

//   // Step 2: Create a new event
//   it("should create a new event", async () => {
//     memoryStore.event = await createEvent("Test Event");
//     console.log("Event created:", memoryStore.event._id);
//   });

//   // Step 3: RSVP pairs
//   it("should RSVP and accept", async () => {
//     await rsvpPairs(); // reads users/event from memory, stores pairs
//     console.log("Pairs created:", memoryStore.pairs.length);
//   });

//   // Step 4: Set event time to now
//   it("should set event time to now", async () => {
//     await setEventTimeNow(memoryStore.event);
//     console.log("Event time set to:", memoryStore.event.startTime);
//   });

//   // Step 5: Live scenario test
//   it("should proceed with live scenarios", async () => {
//     await joinLive(); // loop through live socket scenario
//     console.log("Live scenario complete.");
//     console.log("Users in memory:", memoryStore.users.length);
//     console.log("Event ID:", memoryStore.event._id);
//     console.log("Pairs created:", memoryStore.pairs.length);
//   });

// });
