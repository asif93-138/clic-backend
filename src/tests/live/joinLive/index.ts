
import { io, Socket } from "socket.io-client";
import { memoryStore } from "../memoryStore/memoryStore";
import displayMemory from "./displayMemory";
const BASE = "http://localhost:5006"; // your server URL
const displayInterval = setInterval(displayMemory, 500);

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function makePairKey(u1: string, u2: string) {
  return [u1, u2].sort().join("-");
}

export default async function joinLive(goalPerUser: number = 30) {
  const users = memoryStore.users;
  const userIds = Object.keys(users);

  console.log("Starting live test for", userIds.length, "users");

  // Create socket connections for all users once
  const sockets: Record<string, Socket> = {};
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
  }

  // Start CLI display loop
  const displayInterval = setInterval(displayMemory, 500);

  // Start all user loops in parallel
  await Promise.all(
    userIds.map((uid) => userLoop(uid, users[uid], sockets[uid], goalPerUser))
  );

  clearInterval(displayInterval); // stop display when done
  displayMemory(); // final display
  console.log("🎉 All users reached their goal!");
}

async function userLoop(
  userId: string,
  user: any,
  socket: Socket,
  goal: number
) {
  let inWaitingRoom = false;
  let inDatingRoom = false;
  let leaveTimeout: NodeJS.Timeout | null = null;

  // Listen for match events
  socket.on(`match_found:${userId}`, async (matchData: any) => {
    if (inDatingRoom) return;

    inWaitingRoom = false;
    inDatingRoom = true;
    delete memoryStore.waitingRoom[userId];

    const pairKey = makePairKey(matchData.pair[0], matchData.pair[1]);
    if (!memoryStore.datingRooms[pairKey]) {
      memoryStore.addToDatingRoom(pairKey, {
        users: matchData.userData,
        dateRoomId: matchData.dateRoomId,
      });
    }

    const delay = Math.random() * 3000 + 1000;
    leaveTimeout = setTimeout(async () => {
      await fetch(`${BASE}/leaveDatingRoom`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: memoryStore.event.eventId,
          user_id: userId,
          left_early: false,
        }),
      });
      leaveTimeout = null;
    }, delay);
  });

  // Listen for has_left:* to cancel timeout and update memory
  socket.on(`has_left:*`, (dateRoomId: string) => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      leaveTimeout = null;
    }

    for (const key in memoryStore.datingRooms) {
      if (memoryStore.datingRooms[key].dateRoomId === dateRoomId) {
        delete memoryStore.datingRooms[key];
        break;
      }
    }
    inDatingRoom = false;
  });

  while (user.completedMatches.length < goal) {
    if (!inWaitingRoom && !inDatingRoom) {
      await fetch(`${BASE}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: memoryStore.event.eventId,
          user: {
            user_id: userId,
            gender: user.gender,
            interested: user.gender === "M" ? "F" : "M",
          },
          rejoin: false,
        }),
      });
      inWaitingRoom = true;
      memoryStore.waitingRoom[userId] = user;
    }

    await wait(100);
  }

  await fetch(`${BASE}/leave_event`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: memoryStore.event.eventId,
      user: {
        user_id: userId,
        gender: user.gender,
        interested: user.interested,
      },
    }),
  });

  console.log(`User ${userId} completed goal and left event.`);
}
