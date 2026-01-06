import { Request, Response } from "express";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import Event from "../models/event";
import WaitingRoom from "../models/waitingRoom";
import CallHistory from "../models/callHistory";
import DatingRoom from "../models/datingRoom";
import User from "../models/user.model";
import FailedClic from "../models/failedClic";
import Matched from "../models/matched";
import { io } from "../server";
import { userSocketMap } from "../utils/socketIOSetup";

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

async function liveMatches(data: any) {
  const { event_id, user_id, gender, interested, rejoin } = data;
  if (!rejoin) {
    const potentialMatches = [];

    const interestedGenderArray = await WaitingRoom.find({
      event_id: event_id,
      gender: interested,
      in_event: true,
    });

    for (const user of interestedGenderArray) {
      if (!user.call_history.includes(user_id)) {
        const userData = await User.findById(user.user_id, "userName imgURL");
        potentialMatches.push(userData);
      }
    }
    const userData = await User.findById(user_id, "userName imgURL");

    io.to(event_id).emit(`${event_id}-${gender}-potential-matches`, userData);

    return { potentialMatches };
  }
}

function hasTimePassedPlusHours(datetimeStr: string, duration: number) {
  // Parse as UTC Date object
  const originalDate = new Date(datetimeStr); // 'Z' ensures UTC

  // Add hours
  const futureDate = new Date(
    originalDate.getTime() + duration * 60 * 1000
  );

  // Get current UTC time
  const nowUTC = new Date();

  // Check if current UTC time has passed the future time
  const hasPassed = nowUTC > futureDate;

  // Format adjusted time in UTC as 'YYYY-MM-DDTHH:mm'
  const y = futureDate.getUTCFullYear();
  const m = String(futureDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(futureDate.getUTCDate()).padStart(2, "0");
  const h = String(futureDate.getUTCHours()).padStart(2, "0");
  const min = String(futureDate.getUTCMinutes()).padStart(2, "0");
  const adjustedTime = `${y}-${m}-${d}T${h}:${min}`;

  return {
    adjustedTime,
    hasPassed,
  };
}

async function pairingFunction(user: any, event_id: any, timer: any) {
  // fetch potential matches
  const user_id = user.user_id;
  const interestedIn = user.interested;
  const interestedGenderArray = await WaitingRoom.find({
    event_id: event_id,
    gender: interestedIn,
    status: "active",
    in_event: true,
  }); // type of x

  // early return if potential matches empty
  if (!interestedGenderArray || interestedGenderArray.length === 0) return;

  // iterate over each potental match to find match
  for (let i = 0; i < interestedGenderArray.length; i++) {
    const selectedUser = interestedGenderArray[i];
    // see if the user we are matching with is me, early return
    // if (selectedUser.user_id === user_id) continue;

    const userIdArray = [user_id, selectedUser.user_id].sort();

    // check if we already spoke
    // const call_history = await CallHistory.find({
    //   event_id: event_id,
    //   person_1: userIdArray[0],
    //   person_2: userIdArray[1],
    // });

    // if (
    //   call_history[0]?.person_1 == userIdArray[0] &&
    //   call_history[0]?.person_2 == userIdArray[1]
    // ) {
    //   continue;
    // }

    if (selectedUser.call_history.includes(user_id)) continue;

    // check match found
    if (selectedUser.interested === user.gender) {
      // seperate if check condition in helper func
      const dateRoomId = Math.random().toString(36).substring(2, 12); // dateroomID generator in seperate service

      // fetch matched user's profile pic + username (consider service)
      const queryData_1 = await User.findById(user.user_id, "userName imgURL");
      const queryData_2 = await User.findById(
        selectedUser.user_id,
        "userName imgURL"
      );

      const user_1 = {
        user_id: user.user_id,
        gender: user.gender,
        interested: user.interested,
        username: queryData_1?.userName,
        imgURL: queryData_1?.imgURL,
      };
      const user_2 = {
        user_id: selectedUser.user_id,
        gender: selectedUser.gender,
        interested: selectedUser.interested,
        username: queryData_2?.userName,
        imgURL: queryData_2?.imgURL,
      };

      const socketEmission = {
        pair: userIdArray,
        userData: [user_1, user_2],
        dateRoomId,
      };

      // const deletePersonOne = await WaitingRoom.deleteOne({ user_id: userIdArray[0], event_id: event_id });
      // const deletePersonTwo = await WaitingRoom.deleteOne({ user_id: userIdArray[1], event_id: event_id });

      // Move from waiting room -> Dating Room (move to db layer)
      const deletePersonOne = await WaitingRoom.findOneAndUpdate(
        { event_id: event_id, user_id: userIdArray[0] },
        { status: "inactive", $push: { call_history: userIdArray[1] } }
      );
      const deletePersonTwo = await WaitingRoom.findOneAndUpdate(
        { event_id: event_id, user_id: userIdArray[1] },
        { status: "inactive", $push: { call_history: userIdArray[0] } }
      );

      // Push to dateroom (move to db layer)
      const dateRoomData = {
        event_id: event_id,
        ...socketEmission,
        extension: [],
      };
      const insertDateRoomData = await DatingRoom.create(dateRoomData);

      // Push to call history (move to db layer)
      const callHistoryData = {
        event_id: event_id,
        dateRoomDocId: insertDateRoomData._id,
        person_1: socketEmission.pair[0],
        person_2: socketEmission.pair[1],
        startedAt: new Date(),
      };
      const insertCHData = await CallHistory.create(callHistoryData);

      // agora authentication + setup
      const channelName = dateRoomId;

      const role = RtcRole.PUBLISHER; // or the corresponding constant in your library

      const expirationInSeconds = 3600; // e.g. 1 hour
      const currentTs = Math.floor(Date.now() / 1000);
      const tokenExpire = currentTs + expirationInSeconds;
      const privilegeExpire = currentTs + expirationInSeconds; // usually same or can be less/more

      function generateToken(uid: number) {
        if (!APP_ID || !APP_CERTIFICATE) return;
        const token = RtcTokenBuilder.buildTokenWithUid(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          uid,
          role,
          tokenExpire,
          privilegeExpire
        );
        return token;
      }
      // Emit match event to all users in the event room 
      io.to(event_id).emit(`match_found:${socketEmission.pair[0]}`, {
        ...socketEmission,
        timer,
        dateRoomDocId: insertDateRoomData._id,
        agoraToken: generateToken(1),
        uid: 1,
        remoteUID: 1,
      });
      io.to(event_id).emit(`match_found:${socketEmission.pair[1]}`, {
        ...socketEmission,
        timer,
        dateRoomDocId: insertDateRoomData._id,
        agoraToken: generateToken(2),
        uid: 2,
        remoteUID: 2,
      });

      const socketId1 = userSocketMap.get(socketEmission.pair[0]).socket_id;
      if (socketId1) {
        const socket = io.sockets.sockets.get(socketId1);
        socket!.join(dateRoomId);
      }
      const socketId2 = userSocketMap.get(socketEmission.pair[1]).socket_id;
      if (socketId2) {
        const socket = io.sockets.sockets.get(socketId2);
        socket!.join(dateRoomId);
      }

      return;
    }
  }
}

export async function eventJoining(req: any, res: any) {
  const { event_id, user, rejoin } = req.body;
  const eventData = await Event.findOne({ _id: event_id });
  if (!eventData) {
    res.status(404).json({ message: "Event not found!" });
    return;
  }

  const eventTime = eventData.date_time;

  if (
    hasTimePassedPlusHours(
      eventTime + ":00Z",
      eventData.event_duration
    ).hasPassed
  ) {
    res.status(410).json({ message: "event ended!" });
    return;
  }

  if (!rejoin && hasTimePassedPlusHours(eventTime + ":00Z", eventData.gate_closing).hasPassed) {
    res.status(410).json({ message: "gate closed!" });
    return;
  }

  let flag = false;
  const eventEndTime = hasTimePassedPlusHours(
    eventTime + ":00Z",
    eventData.event_duration
  ).adjustedTime;
  const userObj = await WaitingRoom.find({
    event_id: event_id,
    user_id: user.user_id,
  });

  if (userObj[0]) flag = true;

  const socketObj = userSocketMap.get(user.user_id);
  socketObj.event_id = event_id;
  socketObj.gender = user.gender;
  socketObj.interested = user.interested;
  const socketId = socketObj.socket_id;
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    socket!.join(event_id);
  }

  if (!flag) {
    try {
      const data = {
        event_id: event_id,
        user_id: user.user_id,
        gender: user.gender,
        interested: user.interested,
        status: "active",
        in_event: true,
        call_history: []
      };
      const insertedResult = await WaitingRoom.create(data);
      const liveMatchesObj = await liveMatches({ event_id, ...user, rejoin });
      res.send({
        user_id: user.user_id,
        event_time: eventEndTime,
        callHistory: [],
        potentialMatches: liveMatchesObj?.potentialMatches,
        extend_limit: eventData.extension_limit,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  } else {
    if (userObj[0].status != "active" || userObj[0].in_event != true) {
      const updateData = await WaitingRoom.findByIdAndUpdate(userObj[0]._id, {
        status: "active",
        in_event: true,
      });
    }
    const liveMatchesObj = await liveMatches({ event_id, ...user, rejoin });
    res.send({
      user_id: user.user_id,
      event_time: eventEndTime,
      callHistory: rejoin ? undefined : userObj[0].call_history,
      potentialMatches: liveMatchesObj?.potentialMatches,
      extend_limit: eventData.extension_limit,
    });
  }
  res.on("finish", () => {
    pairingFunction(user, event_id, eventData.call_duration);
  });
}

export async function leaveDatingC(req: Request, res: Response) {
  leaveDatingRoom(req.body.event_id, req.body.user_id, req.body.left_early);
  res.json({ message: "leaving dating room.." });
}

export async function leaveDatingRoom(event_id: any, user_id: any, left_early: any) {
  const result: any = await DatingRoom.find({ event_id: event_id });
  let data;
  //conditional
  for (let i = 0; i < result.length; i++) {
    if (result[i].pair.includes(user_id)) {
      data = result[i];
      // leaveDating and joinWaiting logic here
      // const updatedArr = result.toSpliced(i, 1);

      // const updatedResult = await OpEvent.findOneAndUpdate(
      //   { event_id: event_id },
      //   { dating_room: updatedArr }
      // );
      await DatingRoom.findByIdAndDelete(data._id);
      await CallHistory.findOneAndUpdate(
        { event_id: event_id, person_1: data.pair[0], person_2: data.pair[1] },
        { endedAt: new Date(), left_early: left_early }
      );
      if (data.extension.length) {
        await FailedClic.create({
          event_id: data.event_id,
          dateRoomDocId: data._id,
          person_1: data.pair[0],
          person_2: data.pair[1],
          requested: data.extension[0],
        });
      }
      // emit
      io.to(data.dateRoomId).emit(`has_left:${data.dateRoomId}`);
      const socketId1 = userSocketMap.get(data.pair[0]).socket_id;
      if (socketId1) {
        const socket = io.sockets.sockets.get(socketId1);
        socket!.leave(data.dateRoomId);
      }
      const socketId2 = userSocketMap.get(data.pair[1]).socket_id;
      if (socketId2) {
        const socket = io.sockets.sockets.get(socketId2);
        socket!.leave(data.dateRoomId);
      }
      break;
    }
  }
}

export async function eventLeavingC(req: Request, res: Response) {
  eventLeaving(req.body);
  res.json({ message: "event left!" });
}

export async function eventLeaving(params: any) {
  // await WaitingRoom.deleteOne({event_id: params.event_id, user_id: params.user.user_id});
  await WaitingRoom.findOneAndUpdate(
    { event_id: params.event_id, user_id: params.user.user_id },
    { status: "inactive", in_event: false }
  );
  const socketObj = userSocketMap.get(params.user.user_id);
  delete socketObj.event_id;
  delete socketObj.gender
  delete socketObj.interested;
  const socketId = socketObj.socket_id;
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    socket!.leave(params.event_id);
  }
  io.to(params.event_id).emit(
    `${params.event_id}-${params.user.gender}-potential-matches-left`,
    params.user.user_id
  );
}

export async function extensionC(req: Request, res: Response) {
  const { user_id, dateRoomId, event_id } = req.body;
  const result: any = await DatingRoom.findOne({
    event_id: event_id,
    dateRoomId: dateRoomId,
  });

  if (!result.extension.includes(user_id)) {
    const data = result;
    const updatedArr = result.extension;
    updatedArr.push(user_id);
    if (updatedArr.length === 2) {
      io.to(dateRoomId).emit(`clicked:${dateRoomId}`);
      updatedArr.sort();
      // const updateResult = await Matched.create({
      //   event_id: event_id,
      //   person_1: updatedArr[0],
      //   person_2: updatedArr[1],
      // });
      const filter = {
        event_id: event_id,
        dateRoomDocId: result._id,
        person_1: updatedArr[0],
        person_2: updatedArr[1],
      };
      const update = {
        $inc: { count: 1 }, // increment count by 1
      };
      const options = {
        upsert: true, // create if doesn't exist
        new: true, // return the updated/new document
      };
      const matchInsertion = await Matched.findOneAndUpdate(
        filter,
        update,
        options
      );
      const updateResult = await DatingRoom.findByIdAndUpdate(result._id, {
        extension: [],
      });
      res.json({ message: "both party have extended" });
    } else {
      const updateResult = await DatingRoom.findByIdAndUpdate(result._id, {
        extension: updatedArr,
      });
      io.to(dateRoomId).emit(`extend_request:${dateRoomId}`, { user_id });
      res.json({ message: "waiting for your partner" });
    }
  }
}

export async function leaveDatingSessionC(req: Request, res: Response) {
  const result: any = await DatingRoom.findOne(
    { event_id: req.body.event_id, dateRoomId: req.body.dateRoomId },
    "sessionExpired"
  );
  if (!result.sessionExpired) {
    await DatingRoom.findByIdAndUpdate(result._id, { sessionExpired: true });
    io.to(req.body.dateRoomId).emit(`dating_session_left:${req.body.dateRoomId}`);
  }
}

export async function disconnectUser(event_id: any, user: any) {
  await leaveDatingRoom(event_id, user.user_id, true);
  await eventLeaving({ event_id, user });
}

// (async function() {
// const data = {
//   event_id: "69243fef4d8c79aa0f272ca4",
//   user_id: "69243fef4d8c79aa0f272ca0",
//   gender: "M",
//   interested: "F",
//   status: "active",
//   in_event: true,
//   call_history: ["69243fef4d8c79aa0f272ca0"]
// };
// const insertedResult = await WaitingRoom.create(data);
// console.log(await WaitingRoom.findOneAndUpdate(
//   {event_id: "69243fef4d8c79aa0f272ca4", user_id: "69243fef4d8c79aa0f272ca0"},
//   { status: "inactive", $push: { call_history: "69243fef4d8c79aa0f272c9b" } }
// ));
// const result = await WaitingRoom.findOne({event_id: "69243fef4d8c79aa0f272ca4", user_id: "69243fef4d8c79aa0f272ca0"});
// console.log(result?.call_history.includes('69243fef4d8c79aa0f272czz'));
// })();