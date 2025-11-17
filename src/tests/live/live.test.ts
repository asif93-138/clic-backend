// import { createBulkUsers, expectUsersCreated } from "./createUsers";
// import { createEvent, expectEventCreated } from "./createEvent";
// import { rsvpUsers, expectRsvpCreated } from "./rsvpUsers";
// import { setEventTimeNow, expectEventTimeSet } from "./setEventTime";
// import { memoryStore } from "./helpers/memoryStore";

// describe("Live Feature Workflow", () => {

//   // Step 1: Create users
//   it("should create N users (half male, half female)", async () => {
//     await createBulkUsers(10); // creates users and stores in memory
//     expectUsersCreated(memoryStore.users, 10);
//   });

//   // Step 2: Create a new event
//   it("should create a new event", async () => {
//     memoryStore.event = await createEvent("Test Event");
//     expectEventCreated(memoryStore.event);
//   });

//   // Step 3: RSVP pairs
//   it("should RSVP and accept", async () => {
//     await rsvpPairs(); // reads users/event from memory, stores pairs
//     expectPairsCreated(memoryStore.pairs, 5); // half of 10 users
//   });

//   // Step 4: Set event time to now
//   it("should set event time to now", async () => {
//     await setEventTimeNow(memoryStore.event);
//     expectEventTimeSet(memoryStore.event);
//   });

//   // Step 5: Live scenario test
//   it("should proceed with live scenarios", async () => {
//     // Example placeholder: you can add your complex workflow here
//     console.log("Users in memory:", memoryStore.users.length);
//     console.log("Event ID:", memoryStore.event._id);
//     console.log("Pairs created:", memoryStore.pairs.length);

//     // Example assertion
//     expect(memoryStore.users.length).toBe(10);
//     expect(memoryStore.pairs.length).toBe(5);
//     expect(memoryStore.event.startTime).toBeDefined();
//   });

// });
