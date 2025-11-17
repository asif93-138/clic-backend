// Centralized in-memory store for the live workflow
class MemoryStore {
  users: {
    _id: string;
    name?: string;
    gender?: "male" | "female";
    currentRoom?: "waiting" | "dating" | null;
    completedMatches?: string[];
    [key: string]: any;
  }[] = [];

  event: any = null;

  pairs: {
    male: string;
    female: string;
    event: string;
    [key: string]: any;
  }[] = [];

  // Add a user to the store
  addUser(user: any) {
    this.users.push({ ...user, currentRoom: null, completedMatches: [] });
  }

  // Add multiple users
  addUsers(users: any[]) {
    users.forEach(u => this.addUser(u));
  }

  // Add a pair
  addPair(pair: any) {
    this.pairs.push(pair);
  }

  // Reset all data
  reset() {
    this.users = [];
    this.event = null;
    this.pairs = [];
  }
}

// Export a singleton instance
export const memoryStore = new MemoryStore();

// Usage example:
// import { memoryStore } from "../memoryStore";
// memoryStore.addUser({ _id: "1m", name: "User1", gender: "male" });
// memoryStore.event = newEvent;
// memoryStore.addPair({ male: "1m", female: "2f", event: newEvent._id });
