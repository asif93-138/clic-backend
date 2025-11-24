type User = {
  username: string;
  token: string;
  gender: "M" | "F";
  completedMatches: string[];
};

type Users = {
  [_id: string]: User;
};

type WaitingRoom = {
  [_id: string]: User;
};

type DatingRoom = {
  [pair: string]: {
    dateRoomId:string;
    users: User[];
    startedAt?: Date;
  };
};

type Event = {
  eventId: string;
  title: string;
  startTime: string;
};

// Centralized in-memory store for the live workflow
class MemoryStore {
  users: Users = {};
  event: Event = { eventId: "", title: "", startTime: "" };
  waitingRoom: WaitingRoom = {};
  datingRooms: DatingRoom = {};

  /** Add a single user */
  addUser(_id: string, user: Omit<User, "completedMatches">) {
    this.users[_id] = { ...user, completedMatches: [] };
  }

  /** Add multiple users - Dont use */
  addUsers(users: { _id: string; user: Omit<User, "completedMatches"> }[]) {
    users.forEach(({ _id, user }) => this.addUser(_id, user));
  }

  /** Update completed matches for a user */
  updateCompletedMatches(userId: string, matchId: string) {
    if (!this.users[userId]) return;
    if (!this.users[userId].completedMatches.includes(matchId)) {
      this.users[userId].completedMatches.push(matchId);
    }
  }

  /** Waiting room operations */
  addToWaitingRoom(_id: string) {
    const user = this.users[_id];
    if (user) {
      this.waitingRoom[_id] = user;
    }
  }

  removeFromWaitingRoom(_id: string) {
    delete this.waitingRoom[_id];
  }

  /** Dating room operations */
  addToDatingRoom(pair: string, room: { users: User[]; startedAt?: Date, dateRoomId:string }) {
    this.datingRooms[pair] = room;
  }

  removeFromDatingRoom(roomId: string) {
    delete this.datingRooms[roomId];
  }

  /** Reset all data */
  reset() {
    this.users = {};
    this.event = { eventId: "", title: "", startTime: "" };
    this.waitingRoom = {};
    this.datingRooms = {};
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore();

// Usage example:
// import { memoryStore } from "../memoryStore";
// memoryStore.addUser({ _id: "1m", name: "User1", gender: "male" });
// memoryStore.event = newEvent;
// memoryStore.addPair({ male: "1m", female: "2f", event: newEvent._id });
