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

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT as string, 10) || 5000;
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

  // socket.on('join_event', (event_id: any) => {
  //   socket.join(event_id);
  //   console.log(`######### Client ${socket.gender} joined event room ${event_id}`);
  // });

  // socket.on("switch_room", ({ from, to }: any , callback: any) => {
  //   socket.leave(from);
  //   socket.join(to);
  //   console.log(`Client ${socket.gender} switched from ${from} to room ${to}`);
  //   // Call the callback to acknowledge the switch
  //   if (callback) callback({ status: 'success' });
  // });

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
  // console.log(result);
  if (!result) {
    try {
      const data = {
        event_id: event_id,
        event_time: hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).adjustedTime,
        waiting_room: {
          M: user.gender === "M" ? [user] : [],
          F: user.gender === "F" ? [user] : []
        },
        dating_room: [],
        call_history: [],
        matched: []
      };
      const insertedResult = await OpEvent.create(data);
      console.log('#############################');
      console.log({ user_id: user.user_id, event_time: hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).adjustedTime });
      res.send({ user_id: user.user_id, event_time: hasTimePassedPlus3Hours(eventTime, eventData.event_durations[0]).adjustedTime });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  } else {
    const genderArr = result.waiting_room[user.gender];

    for (let i = 0; i < genderArr.length; i++) {
      if (genderArr[i].user_id === user.user_id) {
        flag = true;
        break;
      }
    }
    if (!flag) {
      try {
        const updatedResult = await OpEvent.findOneAndUpdate(
          { event_id: event_id },
          { $push: { [`waiting_room.${user.gender}`]: user } },
          { new: true }
        );

        console.log('#############################');
        console.log({ user_id: user.user_id, event_time: result.event_time });
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
  const result: any = await OpEvent.findOne({ event_id: event_id });
  let data;
  //conditional
  for (let i = 0; i < result.dating_room.length; i++) {
    if (result.dating_room[i].pair.includes(user_id)) {
      console.log(`[CONNECTED] User ${user_id} leaving dating_room at index ${i} and will join waiting_room`);
      data = result.dating_room[i];
      // leaveDating and joinWaiting logic here
      const updatedArr = result.dating_room.toSpliced(i, 1);

      const updatedResult = await OpEvent.findOneAndUpdate(
        { event_id: event_id },
        { dating_room: updatedArr }
      );

      // emit
      io.emit(`has_left:${data.dateRoomId}`);

      break;
    }
  }
  // call [join - pairing - if pair match
  // response
  console.log('----- leaveDatingRoom function ended -----');
}

app.delete("/leave_event", async (req, res) => {
  eventLeaving(req.body);
  res.json({ message: 'event left!' });
});

async function eventLeaving(params: any) {
  console.log('--- eventLeaving function started ---');
  const result: any = await OpEvent.findOne({ event_id: params.event_id });
  if (params.user.gender === 'M') {
    for (let i = 0; i < result.waiting_room.M.length; i++) {
      if (result.waiting_room.M[i].user_id === params.user.user_id) {
        const updatedArr = result.waiting_room.M.toSpliced(i, 1);
        const updateResult = await OpEvent.findByIdAndUpdate(result._id, { waiting_room: { M: updatedArr, F: result.waiting_room.F } });
        return;
      }
    }
  } else {
    for (let i = 0; i < result.waiting_room.F.length; i++) {
      if (result.waiting_room.F[i].user_id === params.user.user_id) {
        const updatedArr = result.waiting_room.F.toSpliced(i, 1);
        const updateResult = await OpEvent.findByIdAndUpdate(result._id, { waiting_room: { M: result.waiting_room.M, F: updatedArr } });
        return;
      }
    }
  }
  console.log('--- eventLeaving function ended ---');
}

app.put('/extend', async (req: any, res: any) => {
  console.log('---  /extend api started ---');
  const { user_id, dateRoomId, event_id } = req.body;
  const result: any = await OpEvent.findOne({ event_id: event_id });
  for (let i = 0; i < result.dating_room.length; i++) {
    if (result.dating_room[i].dateRoomId === dateRoomId && !result.dating_room[i].extension.includes(user_id)) {
      const data = result.dating_room[i];
      const updatedArr = result.dating_room[i].extension;
      updatedArr.push(user_id);
      data.extension = updatedArr;
      const dataArr = result.dating_room;
      dataArr[i] = data;
      const updateResult = await OpEvent.findByIdAndUpdate(result._id, { dating_room: dataArr });
      if (updatedArr.length === 2) {
        io.emit(`clicked:${dateRoomId}`);
        // push to new column
        const updateResult = await OpEvent.findByIdAndUpdate(result._id, { $push: { matched: updatedArr.sort() } });
        res.json({ message: 'both party have extended' });
      } else {
        io.emit(`extend_request:${dateRoomId}`, { user_id });
        res.json({ message: 'waiting for your partner' });
      }
    }
  }
  console.log('---  /extend api ended ---');
});

async function pairingFunction(user: any, event_id: any, timer:any) {
  console.log('----- pairing function started -----');
  const user_id = user.user_id;
  let result: any = await OpEvent.findOne({ event_id: event_id });
  const interestedIn = user.interested;
  const interestedGenderArray = result.waiting_room[interestedIn];

  if (!result || interestedGenderArray.length === 0) return;

  let contFlag = false

  for (let i = 0; i < interestedGenderArray.length; i++) {

    const selectedUser = interestedGenderArray[i];

    if (selectedUser.user_id === user_id) contFlag = true;


    for (let i = 0; i < result.call_history.length; i++) {
      if (result.call_history[i].join() === [user_id, selectedUser.user_id].sort().join()) {
        contFlag = true
        break;
      }
    }
    if (contFlag) continue;
    if (selectedUser.interested === user.gender) {

      const dateRoomId = Math.random().toString(36).substring(2, 12);
      console.log("Match found:", user_id, selectedUser.user_id);

      const socketEmission = {
        pair: [user_id, selectedUser.user_id].sort(),
        userData: [user, selectedUser],
        dateRoomId,
      };

      for (const x of socketEmission.userData) {
        console.log('Removing from waiting room');
        console.log(x);
        let indexM, indexF;
      
        if (x.gender === "M") {
          result.waiting_room.M.forEach((obj: any, index: any) => {
            if (obj.user_id === x.user_id) {
              indexM = index;
            }
          });
          const updatedArrM = result.waiting_room.M.toSpliced(indexM, 1);
          const updateResult = await OpEvent.findByIdAndUpdate(result._id, {
            waiting_room: { M: updatedArrM, F: result.waiting_room.F }
          });
          result.waiting_room.M = updatedArrM;
        } else {
          result.waiting_room.F.forEach((obj: any, index: any) => {
            if (obj.user_id === x.user_id) {
              indexF = index;
            }
          });
          const updatedArrF = result.waiting_room.F.toSpliced(indexF, 1);
          const updateResult = await OpEvent.findByIdAndUpdate(result._id, {
            waiting_room: { M: result.waiting_room.M, F: updatedArrF }
          });
          result.waiting_room.F = updatedArrF;
        }
      }
      

      if (result.dating_room.length === 0) {
        const updateResult = await OpEvent.findByIdAndUpdate(result._id, { dating_room: [{...socketEmission, extension: []}] });
      } else {
        const updateResult = await OpEvent.findByIdAndUpdate(result._id, { dating_room: [...result.dating_room, {...socketEmission, extension: []}] });
      }

      const callHistoryArr = socketEmission.pair;
    const updateResult = await OpEvent.findByIdAndUpdate(result._id, { $push: { call_history: callHistoryArr } });

      console.log('----- socket emission from pairing function -----');
      // Emit match event to all users in the event room
      io.emit(`match_found:${socketEmission.pair[0]}`, {...socketEmission, timer});
      io.emit(`match_found:${socketEmission.pair[1]}`, {...socketEmission, timer});
      console.log(socketEmission);
      console.log('----- socket emission from pairing function -----');
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
