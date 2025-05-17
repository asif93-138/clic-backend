import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import connectDB from "./config/dbConfig";
import initialController from "./controllers/initialController";
import { createUser, checkUsers, getAllUsers, getUser, updateUser, getUserApproved, getUserPP, getUserProfile } from "./controllers/userController";
import { userLogin } from "./controllers/loginController";
import { adminLogin } from "./controllers/adminController";
import { applyEvent, approveEventUser, createEvent, getAllEvents, getEvent, getEventApplicationAndApproval, getEventForApp, getUserPool, updateEvent } from "./controllers/eventController";
import authMiddleware from "./middleware/auth";
import citiesSearchController from "./controllers/citiesSearchController";
import interestsSearchController from "./controllers/interestsSearchController";
import http from "http";
import { Server } from "socket.io";
import OpEvent from "./models/opEvents";
import Event from "./models/event";
import WaitingRoom from "./models/waitingRoom";
import CallHistory from "./models/callHistory";
import DatingRoom from "./models/datingRoom";
import Matched from "./models/matched";

dotenv.config();

// console.log(process.env.PORT);   || 5000

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT as string, 10);
const upload = multer({ dest: 'uploads/' }); // Temporary storage before uploading to cloudinary

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

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
  console.log('Client connected:', socket.gender);


  socket.on('disconnect', () => {
    const event_id = socket.event_id;
    const user_id = socket.user_id;
    const gender = socket.gender;
    const interested = socket.interested;
    console.log('Client disconnected:', socket.gender);
    disconnectUser(event_id, { user_id, gender, interested });
  });
});

async function disconnectUser(event_id: any, user: any) {
  console.log('- disconnectUser Function started -');
  await leaveDatingRoom(event_id, user.user_id);
  await eventLeaving({ event_id, user });
  console.log('- disconnectUser Function ended -');
}

app.post('/join', async (req, res) => {
  eventJoining(req, res);
});

export function hasTimePassedPlus3Hours(datetimeStr: any, duration:any ) {
  // Parse input string to local time
  const [datePart, timePart] = datetimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create local Date object
  const originalDate = new Date(year, month - 1, day, hour, minute);

  // Add 3 hours
  const futureDate = new Date(originalDate.getTime() + duration * 60 * 60 * 1000);

  // Format adjusted date to "YYYY-MM-DDTHH:mm"
  const formatDateLocal = (date: any) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const adjustedTime = formatDateLocal(futureDate);
  const now = new Date();
  const hasPassed = now > futureDate;

  return {
    adjustedTime,
    hasPassed
  };
}

async function eventJoining(req: any, res: any) {
  console.log('----- JOIN STARTED -----');
  const { event_id, user } = req.body;
  const eventData = await Event.findOne({ _id: event_id });
  if (!eventData) {
    res.status(404).json({ message: "Event not found!" });
    return;
  }
  if (!eventData.event_durations) {
    res.status(404).json({ message: "Event durations not found!" });
    return;
  }
  const eventTime = eventData.date_time;

  if (hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).hasPassed) {
    res.status(410).json({ message: "event ended!" });
    return;
  }
  let flag = false;
  
  const result = await OpEvent.findOne({ event_id: event_id });
  if (!result) {
    try {
      const data_1 = {
        event_id: event_id,
        event_time: hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).adjustedTime
      };
      const data_2 = {
        event_id: event_id,
        user_id: user.user_id,
        gender: user.gender,
        interested: user.interested,
      };
      const insertedResult_1 = await OpEvent.create(data_1); 
      const insertedResult_2 = await WaitingRoom.create(data_2);
      res.send({ user_id: user.user_id, event_time: hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).adjustedTime });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  } else {

    const genderArr = await WaitingRoom.find({event_id: event_id, gender: user.gender});

    for (let i = 0; i < genderArr.length; i++) {
      if (genderArr[i].user_id === user.user_id) {
        flag = true;
        break;
      }
    }
    if (!flag) {
      try {
        const data = {
          event_id: event_id,
          user_id: user.user_id,
          gender: user.gender,
          interested: user.interested,
        };
        const insertedResult = await WaitingRoom.create(data);
        res.send({ user_id: user.user_id, event_time: result.event_time });
      } catch (error) {
        console.error(error);
        res.status(500).send('Server Error'); 
      }
    } else {
      res.status(409).json({message: "user already exists!!"});
    }
  }
  res.on('finish', () => {
    if (!flag && eventData.event_durations) pairingFunction(user, event_id, eventData.event_durations[1]);
  });
  console.log('----- JOIN ENDED -----');
}

app.put('/leaveDatingRoom', async (req, res) => {
  console.log('--- LEAVE DATING STARTED ---');

  // await onLeave(req.body.event_id, req.body.user_id, req.body.isDisconnected, res);
  leaveDatingRoom(req.body.event_id, req.body.user_id);
  console.log('--- LEAVE DATING ENDED ---');
  res.json({ message: 'leaving dating room..' });
})

async function leaveDatingRoom(event_id: any, user_id: any) {
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
  await WaitingRoom.deleteOne({event_id: params.event_id, user_id: params.user.user_id});
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
      const updateResult = await DatingRoom.findByIdAndUpdate(result._id, {extension: updatedArr});
      if (updatedArr.length === 2) {
        io.emit(`clicked:${dateRoomId}`);
        updatedArr.sort()
        const updateResult = await Matched.create({
          event_id: event_id,
          person_1: updatedArr[0],
          person_2: updatedArr[1],
        });
        res.json({ message: 'both party have extended' });
      } else {
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
  const interestedGenderArray = await WaitingRoom.find({event_id: event_id, gender: interestedIn});
  
  if (!interestedGenderArray || interestedGenderArray.length === 0) return;

  let contFlag = false

  for (let i = 0; i < interestedGenderArray.length; i++) {

    const selectedUser = interestedGenderArray[i];

    if (selectedUser.user_id === user_id) contFlag = true;

    const userIdArray = [user_id, selectedUser.user_id].sort();

    const call_history = await CallHistory.find({event_id: event_id, person_1: userIdArray[0], person_2: userIdArray[1]});

      if (call_history[0]?.person_1 == userIdArray[0] && call_history[0]?.person_2 == userIdArray[1]) {
        contFlag = true
        break;
      }

    if (contFlag) continue;
    if (selectedUser.interested === user.gender) {

      const dateRoomId = Math.random().toString(36).substring(2, 12);

      const socketEmission = {
        pair: [user_id, selectedUser.user_id].sort(),
        userData: [user, selectedUser],
        dateRoomId,
      };

      const deletePersonOne = await WaitingRoom.deleteOne({ user_id: userIdArray[0], event_id: event_id });
      const deletePersonTwo = await WaitingRoom.deleteOne({ user_id: userIdArray[1], event_id: event_id });
      
      const dateRoomData = {
        event_id: event_id,
        ...socketEmission,
        extension: []
      };

      const insertDateRoomData = await DatingRoom.create(dateRoomData);

      const callHistoryData = {
        event_id: event_id,
        person_1: socketEmission.pair[0],
        person_2: socketEmission.pair[1],
      };
      const insertCHData = await CallHistory.create(callHistoryData);
     
      // Emit match event to all users in the event room
      io.emit(`match_found:${socketEmission.pair[0]}`, {...socketEmission, timer});
      io.emit(`match_found:${socketEmission.pair[1]}`, {...socketEmission, timer});
   
     
      console.log('----- pairing function ended -----');
      return;
    }
  }
}

app.get("/", initialController);
app.get("/users", authMiddleware, getAllUsers);
app.get("/user", authMiddleware, getUser);
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
app.get("/eventUsersApplicationAndApproval", authMiddleware, getEventApplicationAndApproval);

app.post("/register", upload.single('profilePicture'), createUser);
app.post("/event", authMiddleware, upload.single('eventBanner'), createEvent);
app.post("/login", userLogin);
app.post("/admin", adminLogin);
app.post("/eventActionUpdate", authMiddleware, applyEvent);
app.post("/eventUserApproval", authMiddleware, approveEventUser);

app.put("/user/:id", authMiddleware, updateUser);
app.put("/event/:id", authMiddleware, upload.single('eventBanner'), updateEvent);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
