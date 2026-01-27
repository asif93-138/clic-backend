import mongoose from "mongoose";
import connectDB from "./config/dbConfig";
import User from "./models/user.model";
import Event from "./models/event";
import EventUser from "./models/eventUser";
import Chat from "./models/chat";
import ChatMetadata from "./models/chatMetadata";

const event_case:any[] = ["past-approved", "present-approved", "future-new", "future-approved", "future-pending"]

// const otherImageURLs = ["1765304087209-783086381.png", "si-1.jfif", "si-2.avif", "si-3.webp", "si-4.webp"];
const maleImageURLs = ["1765377068784-880713060.jpeg", "1767708391244-13194904.jpg", "29414203809206102.jfif", "Dark%20Character%20Inspiration.jfif"];
const femaleImageURLs = ["kecc5bqvjptfeovn4squ.jpg", "Simple%20Digital%20Arts.jfif"];

export const qAs = [{ "question": "How do you spend most of your time with other people?", "selectedAns": "I engage with an eclectic collection of people I've met from all walks of life" }, { "question": "Which is the most important trait you look for in a partner?", "selectedAns": "Adventurous" }, { "question": "Success: what does success mean to you?", "selectedAns": "Personal contentment, spiritual awakening and/or emotional freedom" }, { "question": "Drugs: Have you taken recreational drugs?", "selectedAns": "Sure - Do you have any on you now" }, { "question": "Lifestyle: I would prioritize having one of the following holidays in any given year", "selectedAns": "Campervan / other adventurous or exploratory trip which may or may not include psychedelics" }, { "question": "Setbacks: How do you handle failure?", "selectedAns": "I roll with the punches. What goes up must come down. And vice versa." }, { "question": "Spirituality:", "selectedAns": "I interact with the spiritual world" }, { "question": "How could you describe your level of engagement in Sports / physical activity?", "selectedAns": "I Run ultra marathons / triathlons / or similar" }, { "question": "Love of nature: I am", "selectedAns": "Happy to live 50/50 city and country/mountains" }, { "question": "How would you describe your taste in music?", "selectedAns": "True connoisseur - Classical or jazz" }];

let maleUserCounter = 0, femaleUserCounter = 0, eventCounter = 0;

// const pastEvents: any[] = [], pastEventID: any[] = [], pastEventIDvsTitle:any = {};
// const currentEvents: any[] = [], currentEventID: any[] = [], currentEventIDvsTitle:any = {};
// const futureEvents: any[] = [], futureEventID: any[] = [], futureEventIDvsTitle:any = {};
const maleActiveUsers = [], maleActiveUserIDs: any[] = [];
const maleInactiveUsers = [], maleInactiveUserIDs: any[] = [];
const femaleActiveUsers = [], femaleActiveUserIDs: any[] = [];
const femaleInactiveUsers = [], femaleInactiveUserIDs: any[] = [];
const rsvpArr: any[] = [], chatData: any[] = [], chatMetaDataArr: any[] = [];

for (let i = 0; i < 1; i++) {
  maleActiveUsers.push({
    email: `user-m-${maleUserCounter}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-M",
    lastName: `${maleUserCounter}`,
    userName: `User-M ${maleUserCounter}`,
    imgURL: "uploads/" + ((i > maleImageURLs.length - 1) ? maleImageURLs[maleImageURLs.length - 1] : maleImageURLs[i]),
    dateOfBirth: Date(),
    gender: "Male",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); maleUserCounter++;
  femaleActiveUsers.push({
    email: `user-f-${femaleUserCounter}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-F",
    lastName: `${femaleUserCounter}`,
    userName: `User-F ${femaleUserCounter}`,
    imgURL: "uploads/" + ((i > femaleImageURLs.length - 1) ? femaleImageURLs[femaleImageURLs.length - 1] : femaleImageURLs[i]),
    dateOfBirth: Date(),
    gender: "Female",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); femaleUserCounter++;
}

for (let i = 0; i < 1; i++) {
  maleInactiveUsers.push({
    email: `user-m-${maleUserCounter}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-M",
    lastName: `${maleUserCounter}`,
    userName: `User-M ${maleUserCounter}`,
    imgURL: "uploads/" + ((i > maleImageURLs.length - 1) ? maleImageURLs[maleImageURLs.length - 1] : maleImageURLs[i]),
    dateOfBirth: Date(),
    gender: "Male",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); maleUserCounter++;
  femaleInactiveUsers.push({
    email: `user-f-${femaleUserCounter}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-F",
    lastName: `${femaleUserCounter}`,
    userName: `User-F ${femaleUserCounter}`,
    imgURL: "uploads/" + ((i > femaleImageURLs.length - 1) ? femaleImageURLs[femaleImageURLs.length - 1] : femaleImageURLs[i]),
    dateOfBirth: Date(),
    gender: "Female",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); femaleUserCounter++;
}

// function formatToYMDHM(date: Date) {
//   const year = date.getUTCFullYear();
//   const month = String(date.getUTCMonth() + 1).padStart(2, "0");
//   const day = String(date.getUTCDate()).padStart(2, "0");
//   const hour = String(date.getUTCHours()).padStart(2, "0");
//   const minute = String(date.getUTCMinutes()).padStart(2, "0");
//   return `${year}-${month}-${day}T${hour}:${minute}`;
// }


// const parsedDate = Date.parse(new Date().toString());

// const dateArr = [new Date(parsedDate - 86400000), new Date(parsedDate), new Date(parsedDate + 86400000)];

// for (let i = 0; i < 1; i++) {
//   pastEvents.push({
//     title: "Test Event-" + (i + 1),
//     imgURL: "uploads/" + ((i > otherImageURLs.length - 1) ? otherImageURLs[0] : otherImageURLs[i]),
//     description: "default text description.",
//     date_time: formatToYMDHM(dateArr[0]),
//     location: "Dhaka",
//     event_status: true,
//     event_duration: 180,
//     call_duration: 180,
//     gate_closing: 30,
//     extension_limit: 3,
//   });
// }

// for (let i = 0; i < 1; i++) {
//   currentEvents.push({
//     title: "Test Event-" + (i + 1),
//     imgURL: "uploads/" + ((i > otherImageURLs.length - 1) ? otherImageURLs[0] : otherImageURLs[i]),
//     description: "default text description.",
//     date_time: formatToYMDHM(dateArr[1]),
//     location: "Dhaka",
//     event_status: true,
//     event_duration: 180,
//     call_duration: 180,
//     gate_closing: 30,
//     extension_limit: 3,
//   });
// }

// for (let i = 0; i < 1; i++) {
//   futureEvents.push({
//     title: "Test Event-" + (i + 1),
//     imgURL: "uploads/" + ((i > otherImageURLs.length - 1) ? otherImageURLs[0] : otherImageURLs[i]),
//     description: "default text description.",
//     date_time: formatToYMDHM(dateArr[2]),
//     location: "Dhaka",
//     event_status: i % 2 == 0 ? true : false,
//     event_duration: 180,
//     call_duration: 180,
//     gate_closing: 30,
//     extension_limit: 3,
//   });
// }

(async function () {
  await connectDB(true);
  await mongoose.connection.dropDatabase();

  const insertedMaleActiveUsers = await User.create(maleActiveUsers);
  insertedMaleActiveUsers.forEach((x: any) => maleActiveUserIDs.push(x._id));
  const insertedMaleInactiveUsers = await User.create(maleInactiveUsers);
  insertedMaleInactiveUsers.forEach((x: any) => maleInactiveUserIDs.push(x._id));
  const insertedFemaleActiveUsers = await User.create(femaleActiveUsers);
  insertedFemaleActiveUsers.forEach((x: any) => femaleActiveUserIDs.push(x._id));
  const insertedFemaleInactiveUsers = await User.create(femaleInactiveUsers);
  insertedFemaleInactiveUsers.forEach((x: any) => femaleInactiveUserIDs.push(x._id));

  for (const ec of event_case) {
    
  }

  // const insertedPastEvents = await Event.create(pastEvents);
  // const insertedCurrentEvents = await Event.create(currentEvents);
  // const insertedFutureEvents = await Event.create(futureEvents);
  // insertedEvents.forEach((x: any) => {
  //   eventIDs.push(x._id); eventIDvsTitle[x._id.toString()] = x.title;
  // });

  // eventIDs.forEach(x => {
  //   const arr: any[] = [];
  //   maleUserIDs.forEach(y => {
  //     rsvpArr.push({event_id: x.toString(), user_id: y.toString(), status: "approved"});
  //     arr.push(y);
  //   });
  //   femaleUserIDs.forEach(z => {
  //     rsvpArr.push({event_id: x.toString(), user_id: z.toString(), status: "approved"});
  //     arr.push(z);
  //   });
  //   chatData.push({type: "group", event_id: x, participants: arr});
  // });
  // const insertedChats = await Chat.create(chatData);
  // insertedChats.forEach(x => chatMetaDataArr.push({chatId: x._id, name: eventIDvsTitle[x.event_id ? x.event_id.toString() : ""], mutedBy: [], disconnectedBy: []}));
  // const insertedChatMetaData = await ChatMetadata.create(chatMetaDataArr);
  // const insertedRSVPs = await EventUser.create(rsvpArr);
  console.log("done!");
})();