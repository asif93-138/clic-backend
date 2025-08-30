import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/dbConfig";
import initialController from "./controllers/initialController";
import { createUser, checkUsers, getAllUsers, getUser, updatePass, getUserApproved, getUserPP, getUserProfile, sendEmailC, pushNotificationUpdate, pushNotificationTest, emailVerificationC, matchVerificationCode, updateUser, getUserData } from "./controllers/userController";
import { userLogin } from "./controllers/loginController";
import { adminDataEvent, adminEventDetails, adminLogin, deleteUnreadNotifications, getAllNotifications, notificationCount, readNotification } from "./controllers/adminController";
import { applyEvent, approveEventUser, createEvent, deletePhoto, eventUserStatus, eventUserStatusAdmin, getAllEvents, getEvent, getEventForApp, getFutureEvents, getUserPool, homePageData, rejectEventUser, updateEvent, uploadTesting } from "./controllers/eventController";
import authMiddleware from "./middleware/auth";
import citiesSearchController from "./controllers/citiesSearchController";
import interestsSearchController from "./controllers/interestsSearchController";
import http from "http";
import { Server } from "socket.io";
import Event from "./models/event";
import WaitingRoom from "./models/waitingRoom";
import CallHistory from "./models/callHistory";
import DatingRoom from "./models/datingRoom";
import Matched from "./models/matched";
import { upload } from "./middleware/multerConfig";
import User from "./models/user.model";
import agenda from "./config/agenda";
import defineNotificationJob from './jobs/sendNotification';
import collectFeedback from "./controllers/feedbackCollection";
import FailedClic from "./models/failedClic";
import { cloudinaryUpload } from "./middleware/cloudinaryUpload";


dotenv.config();

// console.log(process.env.PORT);   || 5000

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT as string, 10);

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Register Agenda job
defineNotificationJob(agenda);

// Start Agenda
(async () => {
agenda.on('ready', async () => {
  // console.log("Agenda is ready");
  await agenda.start(); // <== CRITICAL
});
})();

// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket: any) => {
  const event_id = socket.handshake.query.event_id;
  const user_id = socket.handshake.query.user_id;
  const gender = socket.handshake.query.gender;
  const interested = socket.handshake.query.interested;
  socket.event_id = event_id;
  socket.user_id = user_id;
  socket.gender = gender;
  socket.interested = interested;
  console.log('Client connected:', socket.id);


  socket.on('disconnect', () => {
    const event_id = socket.event_id;
    const user_id = socket.user_id;
    const gender = socket.gender;
    const interested = socket.interested;
    console.log('Client disconnected:', socket.id);
    disconnectUser(event_id, { user_id, gender, interested });
  });
});

async function disconnectUser(event_id: any, user: any) {
  console.log('- disconnectUser Function started -');
  await leaveDatingRoom(event_id, user.user_id, true);
  await eventLeaving({ event_id, user });
  console.log('- disconnectUser Function ended -');
}

app.post('/join', async (req, res) => {
  eventJoining(req, res);
});

export function hasTimePassedPlusHours(datetimeStr: string, duration: number) {
  // Parse as UTC Date object
  const originalDate = new Date(datetimeStr); // 'Z' ensures UTC

  // Add hours
  const futureDate = new Date(originalDate.getTime() + duration * 60 * 60 * 1000);

  // Get current UTC time
  const nowUTC = new Date();

  // Check if current UTC time has passed the future time
  const hasPassed = nowUTC > futureDate;

  // Format adjusted time in UTC as 'YYYY-MM-DDTHH:mm'
  const y = futureDate.getUTCFullYear();
  const m = String(futureDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(futureDate.getUTCDate()).padStart(2, '0');
  const h = String(futureDate.getUTCHours()).padStart(2, '0');
  const min = String(futureDate.getUTCMinutes()).padStart(2, '0');
  const adjustedTime = `${y}-${m}-${d}T${h}:${min}`;

  return {
    adjustedTime,
    hasPassed
  };
}

async function liveMatches(data: any) {
  const {event_id, user_id, gender, interested, rejoin} = data;
  if (!rejoin) {
      const historyArr: any[] = [], historyObj = new Set(), potentialMatches = [];
  
  const interestedGenderArray = await WaitingRoom.find({event_id: event_id, gender: interested, in_event: true});
  
  const call_historyArr = await CallHistory.find({event_id: event_id});
  
  for (const history of call_historyArr) {
    if (history.person_1 == user_id) {historyArr.push(history.person_2); historyObj.add(history.person_2);}
    if (history.person_2 == user_id) {historyArr.push(history.person_1); historyObj.add(history.person_1);}
  }
  
  for (const user of interestedGenderArray) {
    if (!historyObj.has(user.user_id)) {
      const userData = await User.findById(user.user_id, "userName imgURL");
       potentialMatches.push(userData); 
    }
  }
  const userData = await User.findById(user_id, "userName imgURL");
  
  io.emit(`${event_id}-${gender}-potential-matches`, userData);
 
  return {historyArr, potentialMatches};
  }
}

async function eventJoining(req: any, res: any) {
  console.log('----- JOIN STARTED -----');
  const { event_id, user, rejoin } = req.body;
  // console.log("rejoin", rejoin);
  const eventData = await Event.findOne({ _id: event_id });
  if (!eventData) {
    res.status(404).json({ message: "Event not found!" });
    return;
  }

  const eventTime = eventData.date_time;

  if (hasTimePassedPlusHours((eventTime + ":00Z"), (eventData.event_durations[1] / 60)).hasPassed) {
    res.status(410).json({ message: "event ended!" });
    return;
  }
  let flag = false;
  const eventEndTime = hasTimePassedPlusHours((eventTime + ":00Z"), (eventData.event_durations[1] / 60)).adjustedTime;  
  const userObj = await WaitingRoom.find({event_id: event_id, user_id: user.user_id});

    if (userObj[0]) flag = true;
  
    if (!flag) {
      try {
        const data = {
          event_id: event_id,
          user_id: user.user_id,
          gender: user.gender,
          interested: user.interested,
          status: "active",
          in_event: true
        };
        const insertedResult = await WaitingRoom.create(data);
        const liveMatchesObj =  await liveMatches({event_id, ...user, rejoin })
        res.send({ user_id: user.user_id, event_time: eventEndTime, callHistory: liveMatchesObj?.historyArr, potentialMatches: liveMatchesObj?.potentialMatches, extend_limit: eventData.extension_limit});
      } catch (error) {
        console.error(error);
        res.status(500).send('Server Error'); 
      }
    } else {
      if (userObj[0].status != "active" || userObj[0].in_event != true) {
        const updateData = await WaitingRoom.findByIdAndUpdate(userObj[0]._id, {status: "active", in_event: true});
      }
      const liveMatchesObj =  await liveMatches({event_id, ...user, rejoin })
      res.send({ user_id: user.user_id, event_time: eventEndTime, callHistory: liveMatchesObj?.historyArr, potentialMatches: liveMatchesObj?.potentialMatches, extend_limit: eventData.extension_limit});
    }
  res.on('finish', () => {
    if (eventData.event_durations) pairingFunction(user, event_id, eventData.event_durations[0]);
  });
  console.log('----- JOIN ENDED -----');
}

app.put('/leaveDatingRoom', async (req, res) => {
  console.log('--- LEAVE DATING STARTED ---');
  // await onLeave(req.body.event_id, req.body.user_id, req.body.isDisconnected, res);
  leaveDatingRoom(req.body.event_id, req.body.user_id, req.body.left_early);
  console.log('--- LEAVE DATING ENDED ---');
  res.json({ message: 'leaving dating room..' });
})

async function leaveDatingRoom(event_id: any, user_id: any, left_early: any) {
  console.log('----- leaveDatingRoom function started -----');
  const result: any = await DatingRoom.find({ event_id: event_id });
  let data;
  //conditional
  for (let i = 0; i < result.length; i++) {
    if (result[i].pair.includes(user_id)) {
      console.log(`[CONNECTED] User ${user_id} leaving dating_room at index ${i} and will join waiting_room`);
      data = result[i];
      // leaveDating and joinWaiting logic here
      // const updatedArr = result.toSpliced(i, 1);

      // const updatedResult = await OpEvent.findOneAndUpdate(
      //   { event_id: event_id },
      //   { dating_room: updatedArr }
      // );
      await DatingRoom.findByIdAndDelete(data._id);
      await CallHistory.findOneAndUpdate({event_id: event_id, person_1: data.pair[0], person_2: data.pair[1]},
         {endedAt: new Date(), left_early: left_early});
      if (data.extension.length) {
        await FailedClic.create({event_id: data.event_id, dateRoomDocId: data._id, person_1: data.pair[0], person_2: data.pair[1], requested: data.extension[0]});
      }
      console.log(`has_left:${data.dateRoomId}`);
      // emit
      io.emit(`has_left:${data.dateRoomId}`);

      break;
    }
  }
  console.log('----- leaveDatingRoom function ended -----');
}

app.delete("/leave_event", async (req, res) => {
  eventLeaving(req.body);
  res.json({ message: 'event left!' });
});

async function eventLeaving(params: any) {
  console.log('--- eventLeaving function started ---');
  // await WaitingRoom.deleteOne({event_id: params.event_id, user_id: params.user.user_id});
  await WaitingRoom.findOneAndUpdate({event_id: params.event_id, user_id: params.user.user_id}, {status: "inactive", in_event: false});
  console.log("######## emission from leaving!");
  io.emit(`${params.event_id}-${params.user.gender}-potential-matches-left`, params.user.user_id);
  console.log('--- eventLeaving function ended ---');
}

app.put('/extend', async (req: any, res: any) => {
  console.log('---  /extend api started ---');
  const { user_id, dateRoomId, event_id } = req.body;
  const result: any = await DatingRoom.findOne({ event_id: event_id, dateRoomId: dateRoomId });

    if (!result.extension.includes(user_id)) {
      const data = result;
      const updatedArr = result.extension;
      updatedArr.push(user_id);
      if (updatedArr.length === 2) {
        io.emit(`clicked:${dateRoomId}`);
        updatedArr.sort()
        // const updateResult = await Matched.create({
        //   event_id: event_id,
        //   person_1: updatedArr[0],
        //   person_2: updatedArr[1],
        // });
        const filter = {event_id: event_id, dateRoomDocId: result._id, person_1: updatedArr[0], person_2: updatedArr[1]};
        const update = {
            $inc: { count: 1 }  // increment count by 1
        };
        const options = {
            upsert: true,   // create if doesn't exist
            new: true       // return the updated/new document
        };
        const matchInsertion = await Matched.findOneAndUpdate(filter, update, options);
        const updateResult = await DatingRoom.findByIdAndUpdate(result._id, {extension: []});
        res.json({ message: 'both party have extended' });
      } else {
        const updateResult = await DatingRoom.findByIdAndUpdate(result._id, {extension: updatedArr});
        io.emit(`extend_request:${dateRoomId}`, { user_id });
        res.json({ message: 'waiting for your partner' });
      }
    }
  
  console.log('---  /extend api ended ---');
});

async function pairingFunction(user: any, event_id: any, timer:any) {
  console.log('----- pairing function started -----');
  const user_id = user.user_id;
  const interestedIn = user.interested;
  const interestedGenderArray = await WaitingRoom.find({event_id: event_id, gender: interestedIn, status: "active"});

  if (!interestedGenderArray || interestedGenderArray.length === 0) return;

  for (let i = 0; i < interestedGenderArray.length; i++) {

    const selectedUser = interestedGenderArray[i];
 
    if (selectedUser.user_id === user_id) continue;

    const userIdArray = [user_id, selectedUser.user_id].sort();

    const call_history = await CallHistory.find({event_id: event_id, person_1: userIdArray[0], person_2: userIdArray[1]});
  
      if (call_history[0]?.person_1 == userIdArray[0] && call_history[0]?.person_2 == userIdArray[1]) {
        continue;
      }

    if (selectedUser.interested === user.gender) {

      const dateRoomId = Math.random().toString(36).substring(2, 12);

      const queryData_1 = await User.findById(user.user_id, "userName imgURL");
      const queryData_2 = await User.findById(selectedUser.user_id, "userName imgURL");

      const user_1 = {user_id: user.user_id, gender: user.gender, interested: user.interested, username: queryData_1?.userName, imgURL: queryData_1?.imgURL};
      const user_2 = {user_id: selectedUser.user_id, gender: selectedUser.gender, interested: selectedUser.interested, username: queryData_2?.userName, imgURL: queryData_2?.imgURL};

      const socketEmission = {
        pair: [user_id, selectedUser.user_id].sort(),
        userData: [user_1, user_2],
        dateRoomId,
      };

      // const deletePersonOne = await WaitingRoom.deleteOne({ user_id: userIdArray[0], event_id: event_id });
      // const deletePersonTwo = await WaitingRoom.deleteOne({ user_id: userIdArray[1], event_id: event_id });

      const deletePersonOne = await WaitingRoom.findOneAndUpdate({event_id: event_id, user_id: userIdArray[0]}, {status: "inactive"});
      const deletePersonTwo = await WaitingRoom.findOneAndUpdate({event_id: event_id, user_id: userIdArray[1]}, {status: "inactive"});
      
      const dateRoomData = {
        event_id: event_id,
        ...socketEmission,
        extension: []
      };

      const insertDateRoomData = await DatingRoom.create(dateRoomData);

      const callHistoryData = {
        event_id: event_id,
        dateRoomDocId: insertDateRoomData._id,
        person_1: socketEmission.pair[0],
        person_2: socketEmission.pair[1],
        startedAt: new Date()
      };
      const insertCHData = await CallHistory.create(callHistoryData);


      console.log('----- socket emission -----');
      console.log({...socketEmission, timer});

      // Emit match event to all users in the event room
      io.emit(`match_found:${socketEmission.pair[0]}`, {...socketEmission, timer, dateRoomDocId: insertDateRoomData._id});
      io.emit(`match_found:${socketEmission.pair[1]}`, {...socketEmission, timer, dateRoomDocId: insertDateRoomData._id});
   
     
      console.log('----- pairing function ended -----');
      return;
    }
  }
}

app.get("/", initialController);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.get("/users", authMiddleware, getAllUsers);
app.get("/user", authMiddleware, getUser);
app.get("/user-data/:id", authMiddleware, getUserData);
app.get("/userProfilePicture", authMiddleware, getUserPP);
app.get("/events", authMiddleware, getAllEvents);
app.get("/event/:id", authMiddleware, getEvent);
app.get("/eventForApp/:id", authMiddleware, getEventForApp);
app.get("/user_approved", authMiddleware, getUserApproved);
app.get("/userProfile", authMiddleware, getUserProfile);
app.get("/checkUser", checkUsers);
app.get("/cities", citiesSearchController);
app.get("/interests", interestsSearchController);
app.get("/userPools", authMiddleware, getUserPool);
app.get("/eventUserStatus/:id", authMiddleware, eventUserStatus);
app.get("/eventUserStatus-admin", authMiddleware, eventUserStatusAdmin);
app.get("/notification-test", pushNotificationTest);
app.get("/home-page", authMiddleware, homePageData);
app.get("/admin-event-level-data", authMiddleware, adminDataEvent);
app.get("/admin-date-level-data/:id", authMiddleware, adminEventDetails);
app.get("/unread-notification-count", authMiddleware, notificationCount);
app.get("/notifications", authMiddleware, getAllNotifications);
app.get("/future-events-website", getFutureEvents);

app.post("/register", upload.single('profilePicture'), cloudinaryUpload, createUser);
app.post("/event", authMiddleware, upload.single('eventBanner'), cloudinaryUpload, createEvent);
app.post("/login", userLogin);
app.post("/admin", adminLogin);
app.post("/eventActionUpdate", authMiddleware, applyEvent);
app.post("/eventUserApproval", authMiddleware, approveEventUser);
// app.post("/eventUserReject", authMiddleware, rejectEventUser);
app.post("/testUpload", authMiddleware, upload.single('testUpload'), cloudinaryUpload, uploadTesting);
app.post("/sendEmail", authMiddleware, sendEmailC);
app.post("/email-verification-code", emailVerificationC);
app.post("/match-verification-code", matchVerificationCode);
app.post("/notification-register", authMiddleware, pushNotificationUpdate);
app.post("/submitFeedback", collectFeedback);
app.post("/mark-notification-read/:id", authMiddleware, readNotification);

app.put("/reset_pass", updatePass);
app.put("/user/:id", authMiddleware, updateUser);
app.put("/event/:id", authMiddleware, upload.single('eventBanner'), cloudinaryUpload, updateEvent);
app.delete("/deletePhoto", authMiddleware, deletePhoto);
app.delete("/delete-unread-notifications", authMiddleware, deleteUnreadNotifications);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});