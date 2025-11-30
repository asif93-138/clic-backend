import chalk from "chalk";
import { memoryStore } from "../memoryStore/memoryStore";

function clearConsole() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

export default function displayMemory() {
  clearConsole();
  console.log(chalk.blue.bold("===== LIVE EVENT STATUS ====="));
  console.log(
    chalk.green(`Users in Event: ${Object.keys(memoryStore.users).length}`)
  );

  // Waiting Room
  const waitingUsers = Object.keys(memoryStore.waitingRoom);
  console.log(chalk.yellow(`\nWaiting Room (${waitingUsers.length}):`));
  if (waitingUsers.length > 0) {
    waitingUsers.forEach((id) => {
      const u = memoryStore.waitingRoom[id];
      console.log(` - ${u.username} (${u.gender})`);
    });
  } else {
    console.log(" - empty");
  }

  // Dating Rooms
  const datingKeys = Object.keys(memoryStore.datingRooms);
  console.log(chalk.magenta(`\nDating Rooms (${datingKeys.length}):`));
  if (datingKeys.length > 0) {
    datingKeys.forEach((key) => {
      const room = memoryStore.datingRooms[key];
      const users = room.users.map((u: any) => u.username).join(" & ");
      console.log(` - ${users} (roomId: ${room.dateRoomId})`);
    });
  } else {
    console.log(" - empty");
  }

  // Completed users
  const completedUsers = Object.values(memoryStore.users).filter(
    (u) => u.completedMatches.length >= 1
  );
  console.log(chalk.cyan(`\nCompleted Matches (${completedUsers.length}):`));
  if (completedUsers.length > 0) {
    completedUsers.forEach((u) => {
      console.log(` - ${u.username} (matches: ${u.completedMatches.length})`);
    });
  } else {
    console.log(" - none");
  }

  console.log(chalk.blue.bold("\n=============================\n"));
}
