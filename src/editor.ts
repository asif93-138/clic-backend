import mongoose from "mongoose";
import connectDB from "./config/dbConfig";
import User from "./models/user.model";
import Event from "./models/event";
import EventUser from "./models/eventUser";
import Chat from "./models/chat";
import ChatMetadata from "./models/chatMetadata";
import invitations from './models/invitations';

const event_case: any[] = [
  "past-approved", "present-approved", "future-new", "future-approved",
  "future-pending", "future-waiting", "future-invited"
];

const otherImageURLs = [
  // "1765304087209-783086381.png", "si-1.jfif", "si-2.avif", "si-3.webp",
  // "si-4.webp", 
  "Picture%20Frame.png", "Picture%20Frame%20(1).png"
];
const maleImageURLs = [
  "1765377068784-880713060.jpeg", "1767708391244-13194904.jpg",
  "29414203809206102.jfif", "Dark%20Character%20Inspiration.jfif"
];
const femaleImageURLs = [
  "kecc5bqvjptfeovn4squ.jpg", "ded1325db9d85e603966fc8884a4d6a0c3c22820.jpg",
  "Simple%20Digital%20Arts.jfif", "a87946003f8843f7708d295493a2db4d44dabec7.jpg"
];

export const qAs = [
  {
    "question": "How do you spend most of your time with other people?",
    "selectedAns": "I engage with an eclectic collection of people I've met from all walks of life"
  },
  {
    "question": "Which is the most important trait you look for in a partner?",
    "selectedAns": "Adventurous"
  },
  {
    "question": "Success: what does success mean to you?",
    "selectedAns": "Personal contentment, spiritual awakening and/or emotional freedom"
  },
  {
    "question": "Drugs: Have you taken recreational drugs?",
    "selectedAns": "Sure - Do you have any on you now"
  },
  {
    "question": "Lifestyle: I would prioritize having one of the following holidays in any given year",
    "selectedAns": "Campervan / other adventurous or exploratory trip which may or may not include psychedelics"
  },
  {
    "question": "Setbacks: How do you handle failure?",
    "selectedAns": "I roll with the punches. What goes up must come down. And vice versa."
  },
  {
    "question": "Spirituality:",
    "selectedAns": "I interact with the spiritual world"
  },
  {
    "question": "How could you describe your level of engagement in Sports / physical activity?",
    "selectedAns": "I Run ultra marathons / triathlons / or similar"
  },
  {
    "question": "Love of nature: I am",
    "selectedAns": "Happy to live 50/50 city and country/mountains"
  },
  {
    "question": "How would you describe your taste in music?",
    "selectedAns": "True connoisseur - Classical or jazz"
  }
];

let maleUserCounter = 0, femaleUserCounter = 0, eventCounter = 0, malePhotoCounter = 0, femalePhotoCounter = 0, eventPhotoCounter = 0;

const maleActiveUsers = [], maleActiveUserIDs: any[] = [];
const maleInactiveUsers = [], maleInactiveUserIDs: any[] = [];
const femaleActiveUsers = [], femaleActiveUserIDs: any[] = [];
const femaleInactiveUsers = [], femaleInactiveUserIDs: any[] = [];

const activeUsers: any = {};

for (let i = 0; i < 1; i++) {
  maleActiveUsers.push({
    email: `user-m-${maleUserCounter + 1}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-M",
    lastName: `${maleUserCounter + 1}`,
    userName: `User-M ${maleUserCounter + 1}`,
    imgURL: "uploads/" + maleImageURLs[malePhotoCounter],
    dateOfBirth: Date(),
    gender: "Male",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); maleUserCounter++;
  if (malePhotoCounter == (maleImageURLs.length - 1)) malePhotoCounter = 0; else malePhotoCounter++;
  femaleActiveUsers.push({
    email: `user-f-${femaleUserCounter + 1}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-F",
    lastName: `${femaleUserCounter + 1}`,
    userName: `User-F ${femaleUserCounter + 1}`,
    imgURL: "uploads/" + femaleImageURLs[femalePhotoCounter],
    dateOfBirth: Date(),
    gender: "Female",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); femaleUserCounter++;
  if (femalePhotoCounter == (femaleImageURLs.length - 1)) femalePhotoCounter = 0; else femalePhotoCounter++;
}

for (let i = 0; i < 1; i++) {
  maleInactiveUsers.push({
    email: `user-m-${maleUserCounter + 1}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-M",
    lastName: `${maleUserCounter + 1}`,
    userName: `User-M ${maleUserCounter + 1}`,
    imgURL: "uploads/" + maleImageURLs[malePhotoCounter],
    dateOfBirth: Date(),
    gender: "Male",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); maleUserCounter++;
  if (malePhotoCounter == (maleImageURLs.length - 1)) malePhotoCounter = 0; else malePhotoCounter++;
  femaleInactiveUsers.push({
    email: `user-f-${femaleUserCounter + 1}@email.com`,
    password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
    firstName: "User-F",
    lastName: `${femaleUserCounter + 1}`,
    userName: `User-F ${femaleUserCounter + 1}`,
    imgURL: "uploads/" + femaleImageURLs[femalePhotoCounter],
    dateOfBirth: Date(),
    gender: "Female",
    city: "Dhaka",
    where_from: "Dhaka",
    ques_ans: JSON.stringify(qAs),
    hearingPlatform: "Friends or Family",
    referredBy: "Asif",
    approved: "approved",
  }); femaleUserCounter++;
  if (femalePhotoCounter == (femaleImageURLs.length - 1)) femalePhotoCounter = 0; else femalePhotoCounter++;
}

function formatToYMDHM(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

const parsedDate = Date.parse(new Date().toString());

const dateArr = [new Date(parsedDate - 86400000), new Date(parsedDate), new Date(parsedDate + 86400000)];


(async function () {
  await connectDB(true);
  await mongoose.connection.dropDatabase();

  const insertedMaleActiveUsers = await User.create(maleActiveUsers);
  insertedMaleActiveUsers.forEach((x: any) => {
    maleActiveUserIDs.push(x._id);
    activeUsers[x._id.toString()] = { userName: x.userName, imgURL: x.imgURL };
  });
  const insertedFemaleActiveUsers = await User.create(femaleActiveUsers);
  insertedFemaleActiveUsers.forEach((x: any) => {
    femaleActiveUserIDs.push(x._id);
    activeUsers[x._id.toString()] = { userName: x.userName, imgURL: x.imgURL };
  });
  const insertedMaleInactiveUsers = await User.create(maleInactiveUsers);
  insertedMaleInactiveUsers.forEach((x: any) => maleInactiveUserIDs.push(x._id));
  const insertedFemaleInactiveUsers = await User.create(femaleInactiveUsers);
  insertedFemaleInactiveUsers.forEach((x: any) => femaleInactiveUserIDs.push(x._id));

  for (const ec of event_case) {
    const arr: any[] = [], rsvpArr: any[] = [], invitedUser: any[] = [];
    switch (ec) {
      case "past-approved":
        const insertedPastEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[0]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedPastEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedPastEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat = await Chat.create({
          type: "group", event_id: insertedPastEvents._id, participants: arr
        });
        const insertedChatMetaData = await ChatMetadata.create({
          chatId: insertedChat._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs = await EventUser.create(rsvpArr);
        break;

      case "present-approved":
        const insertedPresentEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[1]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedPresentEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedPresentEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_1 = await Chat.create({
          type: "group", event_id: insertedPresentEvents._id, participants: arr
        });
        const insertedChatMetaData_1 = await ChatMetadata.create({
          chatId: insertedChat_1._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_1 = await EventUser.create(rsvpArr);
        break;

      case "future-approved":
        const insertedFutureEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[2]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_2 = await Chat.create({
          type: "group", event_id: insertedFutureEvents._id, participants: arr
        });
        const insertedChatMetaData_2 = await ChatMetadata.create({
          chatId: insertedChat_2._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_2 = await EventUser.create(rsvpArr);
        break;

      case "future-pending":
        const insertedFuturePEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[2]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFuturePEvents._id, user_id: x.toString(), status: "pending" });
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFuturePEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_3 = await Chat.create({
          type: "group", event_id: insertedFuturePEvents._id, participants: arr
        });
        const insertedChatMetaData_3 = await ChatMetadata.create({
          chatId: insertedChat_3._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_3 = await EventUser.create(rsvpArr);
        break;

      case "future-new":
        const insertedFutureNEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[2]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureNEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_4 = await Chat.create({
          type: "group", event_id: insertedFutureNEvents._id, participants: arr
        });
        const insertedChatMetaData_4 = await ChatMetadata.create({
          chatId: insertedChat_4._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_4 = await EventUser.create(rsvpArr);
        break;

      case "future-waiting":
        const insertedFutureWEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[2]),
          location: "Dhaka",
          event_status: true,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureWEvents._id, user_id: x.toString(), status: "waiting" });
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureWEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_5 = await Chat.create({
          type: "group", event_id: insertedFutureWEvents._id, participants: arr
        });
        const insertedChatMetaData_5 = await ChatMetadata.create({
          chatId: insertedChat_5._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_5 = await EventUser.create(rsvpArr);
        break;

      case "future-invited":
        const insertedFutureIEvents = await Event.create({
          title: "Test Event-" + (eventCounter + 1),
          imgURL: "uploads/" + otherImageURLs[eventPhotoCounter],
          description: "default text description.",
          date_time: formatToYMDHM(dateArr[2]),
          location: "Dhaka",
          event_status: false,
          event_duration: 180,
          call_duration: 180,
          gate_closing: 30,
          extension_limit: 3,
        });
        [...maleActiveUserIDs, ...femaleActiveUserIDs].forEach(x => {
          invitedUser.push({
            event_id: insertedFutureIEvents._id,
            title: insertedFutureIEvents.title,
            user_id: x.toString(),
            userName: activeUsers[x.toString()].userName,
            user_imgURL: activeUsers[x.toString()].imgURL,
            status: "invited"
          });
        });
        [...maleInactiveUserIDs, ...femaleInactiveUserIDs].forEach(x => {
          rsvpArr.push({ event_id: insertedFutureIEvents._id, user_id: x.toString(), status: "approved" });
          arr.push(x);
        });
        const insertedChat_6 = await Chat.create({
          type: "group", event_id: insertedFutureIEvents._id, participants: arr
        });
        const insertedChatMetaData_6 = await ChatMetadata.create({
          chatId: insertedChat_6._id, name: "Test Event-" + (eventCounter + 1), mutedBy: [], disconnectedBy: []
        });
        const insertedRSVPs_6 = await EventUser.create(rsvpArr);
        const inviteResult = await invitations.create(invitedUser);
    }
    eventCounter++;
    if (eventPhotoCounter == (otherImageURLs.length - 1)) eventPhotoCounter = 0; else eventPhotoCounter++;
  }

  const directChatArr: any[] = [], directChatMetadataArr: any[] = [];

  maleActiveUserIDs.forEach(x => {
    femaleActiveUserIDs.forEach(y => {
      directChatArr.push({ type: "direct", participants: [x, y] });
    });
  });

  const insertDirectChats = await Chat.create(directChatArr);

  insertDirectChats.forEach(x => {
    directChatMetadataArr.push({
      chatId: x._id, mutedBy: [], disconnectedBy: []
    });
  });

  const insertDirectChatMetaData = await ChatMetadata.create(directChatMetadataArr);

  console.log("done!");
})();