// Centralized in-memory store for the live workflow
class MemoryStore {
  users: any[] = [];
  event: any = null;
  pairs: any[] = [];

  reset() {
    this.users = [];
    this.event = null;
    this.pairs = [];
  }
}

// Export a singleton instance
export const memoryStore = new MemoryStore();

// Usage example:
// import { memoryStore } from "../helpers/memoryStore";
// memoryStore.users.push(newUser);
// memoryStore.event = newEvent;
// memoryStore.pairs.push(newPair);
