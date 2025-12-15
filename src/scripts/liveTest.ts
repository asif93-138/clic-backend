// liveEventSimulation.ts
import mongoose from "mongoose";
import chalk from "chalk";
import { io, Socket } from "socket.io-client";
import connectDB from "../config/dbConfig"; // your MongoDB connection
import User from "../models/user.model";
import Event from "../models/event";
import EventUser from "../models/eventUser";
import { generateToken } from "../utils/jwt";
import { performance } from "perf_hooks";

/** ------------------- Global Config ------------------- */
const maleCount = 10;
const femaleCount = 10;
const leaveDelay = { min: 1000, random: 2500 }; // ms
// npx ts-node src/scripts/liveTest.ts
// run server npm run dev

/** ------------------- Memory Store ------------------- */
type UserType = {
  username: string;
  token: string;
  gender: "M" | "F";
  completedMatches: string[];
  waitingTimes: number[]; // ms for each wait in the waiting room
  waitingStart?: number; // timestamp when user joins waiting room
};

type Users = { [_id: string]: UserType };
type WaitingRoom = { [_id: string]: UserType };
type DatingRoom = {
  [pair: string]: { dateRoomId: string; users: UserType[]; startedAt?: Date };
};
type EventType = { eventId: string; title: string; startTime: string };

class MemoryStore {
  users: Users = {};
  event: EventType = { eventId: "", title: "", startTime: "" };
  waitingRoom: WaitingRoom = {};
  datingRooms: DatingRoom = {};
  callHistory: { user1: string; user2: string }[] = []; // log of matches

  addUser(_id: string, user: Omit<UserType, "completedMatches">) {
    this.users[_id] = { ...user, completedMatches: [] };
  }

  updateCompletedMatches(userId: string, matchId: string, partnerId?: string) {
    if (!this.users[userId]) return;

    if (!this.users[userId].completedMatches.includes(matchId)) {
      this.users[userId].completedMatches.push(matchId);
    }

    // Add to call history without duplicates
    if (partnerId) {
      const u1 = this.users[userId].username;
      const u2 = this.users[partnerId]?.username;
      if (!u2) return;

      // create a sorted pair key
      const pairKey = [u1, u2].sort().join("-");

      // only add if not already in callHistory
      const exists = this.callHistory.some(
        (c) => [c.user1, c.user2].sort().join("-") === pairKey
      );

      if (!exists) {
        this.callHistory.push({ user1: u1, user2: u2 });
      }
    }
  }

  addToWaitingRoom(_id: string) {
    const user = this.users[_id];
    if (user) this.waitingRoom[_id] = user;
  }

  removeFromWaitingRoom(_id: string) {
    delete this.waitingRoom[_id];
  }

  addToDatingRoom(
    pair: string,
    room: { users: UserType[]; startedAt?: Date; dateRoomId: string }
  ) {
    this.datingRooms[pair] = room;
  }

  removeFromDatingRoom(roomId: string) {
    for (const key in this.datingRooms) {
      if (this.datingRooms[key].dateRoomId === roomId) {
        delete this.datingRooms[key];
        break;
      }
    }
  }

  reset() {
    this.users = {};
    this.event = { eventId: "", title: "", startTime: "" };
    this.waitingRoom = {};
    this.datingRooms = {};
    this.callHistory = [];
  }
}

const memoryStore = new MemoryStore();

/** ------------------- Display Memory ------------------- */
function clearConsole() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

function displayMemory(
  outsideEventSet: Set<string>,
  users: Users,
  eventStart?: number
) {
  // if (!outsideEventSet) outsideEventSet = new Set();

  clearConsole();
  const separator = chalk.blue.bold(" | ");

  //   // Users currently in event (waiting room + dating rooms)
  //   const insideUsers = Object.keys(users).filter(
  //     (uid) =>
  //       !outsideEventSet.has(uid) &&
  //       (memoryStore.waitingRoom[uid] ||
  //         Object.values(memoryStore.datingRooms).some((r) =>
  //           r.users.some((u) => u.username === users[uid].username)
  //         ))
  //   );
  console.log(
    chalk.green.bold(
      `Users Participating Event (${Object.keys(memoryStore.users).length})`
    )
  );

  // Waiting Room
  const waitingUsers = Object.values(memoryStore.waitingRoom);
  const waitingLine = waitingUsers
    .map((u) => `${u.username}(${u.gender})`)
    .join(", ");
  console.log(
    chalk.yellow(
      `Waiting Room (${waitingUsers.length}): ${waitingLine || "empty"}`
    )
  );

  // Dating Rooms
  const datingRooms = Object.values(memoryStore.datingRooms);
  const datingLine = datingRooms
    .map((r) => r.users.map((u) => u.username).join(" & "))
    .join(", ");
  console.log(
    chalk.magenta(
      `Dating Rooms (${datingRooms.length}): ${datingLine || "empty"}`
    )
  );

  // Call History
  const callHistoryLine = memoryStore.callHistory
    .map(
      (c) => `${c.user1.replace(/\s+/g, "")} & ${c.user2.replace(/\s+/g, "")}`
    )
    .join(", ");
  console.log(
    chalk.cyan(
      `Call History (${memoryStore.callHistory.length}): ${
        callHistoryLine || "none"
      }`
    )
  );

  // Outside Event
  const outsideUsers = Array.from(outsideEventSet).map(
    (uid) => users[uid]?.username
  );
  console.log(
    chalk.red(
      `Outside Event (${outsideUsers.length}): ${
        outsideUsers.join(", ") || "none"
      }`
    )
  );

  // Event duration and average waits
  if (eventStart) {
    const eventNow = performance.now();
    const totalDuration = ((eventNow - eventStart) / 1000).toFixed(2);

    // Aggregate all waiting times
    const allWaits = Object.values(users)
      .flatMap((u) => u.waitingTimes || [])
      .filter((t) => t > 0); // ignore 0s
    const maleWaits = Object.values(users)
      .filter((u) => u.gender === "M")
      .flatMap((u) => u.waitingTimes || [])
      .filter((t) => t > 0);
    const femaleWaits = Object.values(users)
      .filter((u) => u.gender === "F")
      .flatMap((u) => u.waitingTimes || [])
      .filter((t) => t > 0);

    const avgWaitAll = (
      allWaits.reduce((a, b) => a + b, 0) /
      (allWaits.length || 1) /
      1000
    ).toFixed(2);
    const avgWaitM = (
      maleWaits.reduce((a, b) => a + b, 0) /
      (maleWaits.length || 1) /
      1000
    ).toFixed(2);
    const avgWaitF = (
      femaleWaits.reduce((a, b) => a + b, 0) /
      (femaleWaits.length || 1) /
      1000
    ).toFixed(2);

    console.log(`⏱ Total event duration: ${totalDuration}s`);
    console.log(`Average wait all users: ${avgWaitAll}s`);
    console.log(`Average wait males: ${avgWaitM}s`);
    console.log(`Average wait females: ${avgWaitF}s`);
  }

  console.log(chalk.blue.bold("=".repeat(80))); // bottom separator
}

/** ------------------- Helpers ------------------- */
function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function makePairKey(u1: string, u2: string) {
  return [u1, u2].sort().join("-");
}

function formatToYMDHM(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** ------------------- Create Users ------------------- */
async function createBulkUsers(maleCount: number, femaleCount: number) {
  for (let i = 1; i <= maleCount; i++) {
    const userObj = {
      email: `user-m-${i}@email.com`,
      password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
      firstName: "User-M",
      lastName: `${i}`,
      userName: `User-M ${i}`,
      imgURL: "uploads/banner-5.png",
      dateOfBirth: new Date(),
      gender: "M",
      city: "Dhaka",
      where_from: "Dhaka",
      ques_ans: "[]",
      hearingPlatform: "Friends or Family",
      referredBy: "Asif",
      approved: "approved",
    };
    const result: any = await User.create(userObj);
    memoryStore.addUser(result._id.toString(), {
      username: userObj.userName,
      token: generateToken({ id: result._id.toString() }),
      gender: "M",
      waitingTimes: [],
    });
  }

  for (let i = 1; i <= femaleCount; i++) {
    const userObj = {
      email: `user-f-${i}@email.com`,
      password: "$2b$10$dQcFBT6UF7t1oya/zd.cg.0dhoSJqs.FpliFVz7IrcKbkJ9140kOu",
      firstName: "User-F",
      lastName: `${i}`,
      userName: `User-F ${i}`,
      imgURL: "uploads/banner-5.png",
      dateOfBirth: new Date(),
      gender: "F",
      city: "Dhaka",
      where_from: "Dhaka",
      ques_ans: "[]",
      hearingPlatform: "Friends or Family",
      referredBy: "Asif",
      approved: "approved",
    };
    const result: any = await User.create(userObj);
    memoryStore.addUser(result._id.toString(), {
      username: userObj.userName,
      token: generateToken({ id: result._id.toString() }),
      gender: "F",
      waitingTimes: [],
    });
  }

  console.log("✅ Users created:", Object.keys(memoryStore.users).length);
}

/** ------------------- Create Event ------------------- */
async function createEvent(title: string) {
  const result: any = await Event.create({
    title,
    imgURL: "uploads/banner-5.png",
    description: "default",
    date_time: formatToYMDHM(new Date()),
    location: "Dhaka",
    event_status: false,
    event_duration: 180,
    call_duration: 180,
    gate_closing: 30,
    extension_limit: 3,
  });
  memoryStore.event = {
    eventId: result._id.toString(),
    title,
    startTime: result.date_time,
  };
  console.log("✅ Event created:", memoryStore.event);
}

/** ------------------- RSVP Users ------------------- */
async function rsvpPairs() {
  const userIDs = Object.keys(memoryStore.users);
  const eventUserArr = userIDs.map((userID) => ({
    event_id: memoryStore.event.eventId,
    user_id: userID,
    status: "approved",
  }));
  await EventUser.create(eventUserArr);
  console.log("✅ All users RSVP'd");
}

/** ------------------- Live Simulation ------------------- */
export default async function joinLive() {
  const eventStart = performance.now();
  const users = memoryStore.users;
  const userIds = Object.keys(users);
  const BASE = "http://localhost:5000"; // socket server

  console.log("Starting live simulation for", userIds.length, "users");

  const sockets: Record<string, Socket> = {};
  const leaveTimeouts: Record<string, NodeJS.Timeout | null> = {};
  const inDatingRoom: Record<string, boolean> = {};
  const outsideEvent: Set<string> = new Set();

  // Create socket connections
  for (const userId of userIds) {
    const user = users[userId];
    const socket = io(BASE, {
      query: {
        event_id: memoryStore.event.eventId,
        user_id: userId,
        gender: user.gender,
        interested: user.gender === "M" ? "F" : "M",
      },
      transports: ["websocket"],
    });

    sockets[userId] = socket;
    leaveTimeouts[userId] = null;
    inDatingRoom[userId] = false;

    // Handle match found
    socket.on(`match_found:${userId}`, async (matchData: any) => {
      if (inDatingRoom[userId]) return;

      // Calculate waiting time
      const now = performance.now();
      if (users[userId].waitingStart) {
        const waitDuration = now - users[userId].waitingStart;
        users[userId].waitingTimes.push(waitDuration);
        users[userId].waitingStart = undefined; // reset
      }

      memoryStore.removeFromWaitingRoom(userId);

      const pairKey = makePairKey(matchData.pair[0], matchData.pair[1]);
      if (!memoryStore.datingRooms[pairKey]) {
        memoryStore.addToDatingRoom(pairKey, {
          users: matchData.userData,
          dateRoomId: matchData.dateRoomId,
          startedAt: new Date(),
        });
      }

      // Update completedMatches and callHistory
      const partnerId = matchData.pair.find((id: string) => id !== userId);
      memoryStore.updateCompletedMatches(
        userId,
        matchData.dateRoomId,
        partnerId
      );

      inDatingRoom[userId] = true;

      // Schedule leaving dating room
      leaveTimeouts[userId] = setTimeout(async () => {
        try {
          await fetch(`${BASE}/leaveDatingRoom`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: memoryStore.event.eventId,
              user_id: userId,
              left_early: false,
            }),
          });
        } catch (err) {
          console.error("Failed to leave dating room:", err);
        }

        leaveTimeouts[userId] = null;
        inDatingRoom[userId] = false;

        const roomKey = Object.keys(memoryStore.datingRooms).find((key) =>
          memoryStore.datingRooms[key].users.some(
            (u) => u.username === users[userId].username
          )
        );
        if (roomKey) delete memoryStore.datingRooms[roomKey];
      }, leaveDelay.min + Math.random() * leaveDelay.random);
    });

    // Dynamic leave listener per user
    socket.on(`has_left:${userId}`, (roomId: string) => {
      const room = memoryStore.datingRooms[roomId];
      if (!room) return;

      // Remove user from room
      room.users = room.users.filter(
        (u) => u.username !== users[userId].username
      );

      if (room.users.length === 0) {
        delete memoryStore.datingRooms[roomId]; // remove room only when empty
      }

      inDatingRoom[userId] = false;
    });
  }

  // CLI display
  const displayInterval = setInterval(
    () => displayMemory(outsideEvent, users, eventStart),
    1000
  );

  // Main simulation loop
  while (
    userIds.some(
      (id) =>
        users[id].completedMatches.length <
        (users[id].gender === "M" ? femaleCount : maleCount)
    )
  ) {
    for (const uid of userIds) {
      const user = users[uid];
      // Calculate the per-user goal from global counts
      const userGoal = user.gender === "M" ? femaleCount : maleCount;

      // Leave event if user reached their goal
      if (user.completedMatches.length >= userGoal && !outsideEvent.has(uid)) {
        try {
          await fetch(`${BASE}/leave_event`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: memoryStore.event.eventId,
              user: {
                user_id: uid,
                gender: user.gender,
                interested: user.gender === "M" ? "F" : "M",
              },
            }),
          });
        } catch (err) {
          console.error("Failed to leave event:", err);
        }

        outsideEvent.add(uid);
        memoryStore.removeFromWaitingRoom(uid);
        continue;
      }

      // Join waiting room if not already in it or dating room
      if (
        !memoryStore.waitingRoom[uid] &&
        !inDatingRoom[uid] &&
        !outsideEvent.has(uid)
      ) {
        try {
          await fetch(`${BASE}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: memoryStore.event.eventId,
              user: {
                user_id: uid,
                gender: user.gender,
                interested: user.gender === "M" ? "F" : "M",
              },
              rejoin: false,
            }),
          });
          memoryStore.addToWaitingRoom(uid);

          // Start waiting timer
          users[uid].waitingStart = performance.now();
        } catch (err) {
          console.error("Failed to join waiting room:", err);
        }
      }
    }
    await new Promise((resolve) => setImmediate(resolve));
  }

  // Wait for all users to finish leaving dating rooms
  async function waitForAllLeaves(
    leaveTimeouts: Record<string, NodeJS.Timeout | null>
  ) {
    while (Object.values(leaveTimeouts).some((t) => t !== null)) {
      await wait(50); // small delay to allow timers to fire
    }
  }

  // Main simulation end
  await waitForAllLeaves(leaveTimeouts); // <-- display keeps running
  clearInterval(displayInterval); // stop updating

  const eventEnd = performance.now();
  const totalDuration = ((eventEnd - eventStart) / 1000).toFixed(2); // seconds
  console.log(chalk.green.bold(`⏱ Total event duration: ${totalDuration}s`));

  displayMemory(outsideEvent, users, eventStart);
  console.log(chalk.green.bold("🎉 Live simulation complete!"));
}

/** ------------------- Main Script ------------------- */
async function main() {
  await connectDB(true);
  await mongoose.connection.dropDatabase();

  await createBulkUsers(maleCount, femaleCount);
  await createEvent("Test Event");
  await rsvpPairs();
  await joinLive();

  console.log("All done!");
  await mongoose.disconnect();
}

main().catch((err) => console.error(err));
