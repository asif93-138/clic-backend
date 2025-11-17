// import { memoryStore } from "../memoryStore/";
// import { io, Socket } from "socket.io-client";

// const TOTAL_MATCHES_PER_USER = memoryStore.users.length; // each user should meet everyone else

// export const joinLive = async () => {
//   const users = memoryStore.users;

//   // Create socket instances per user
//   const sockets: Socket[] = users.map(u =>
//     io("http://localhost:5000", { query: { userId: u._id } })
//   );

//   // Helper: display live status
//   const displayStatus = () => {
//     process.stdout.write("\x1Bc"); // clear console
//     console.log("=== Live Matchmaking Status ===");
//     users.forEach(u => {
//       const completed = u.completedMatches?.length || 0;
//       console.log(`${u._id} | ${u.currentRoom || "idle"} | Matches: ${completed}`);
//     });
//   };

//   // Per-user async loop
//   const userLoop = async (user: any, socket: Socket) => {
//     while ((user.completedMatches?.length || 0) < TOTAL_MATCHES_PER_USER) {
//       // Step 1: Join waiting room
//       user.currentRoom = "waiting";
//       socket.emit("join_waiting_room", { userId: user._id });
//       displayStatus();

//       // Step 2: Wait for match
//       const matchedUser: any = await new Promise(res => {
//         const handler = (data: any) => {
//           if (data.userId === user._id) {
//             socket.off("match_found_userid", handler);
//             res(data);
//           }
//         };
//         socket.on("match_found_userid", handler);
//       });

//       // Step 3: Enter dating room
//       const dateroomId = matchedUser.dateroomId;
//       user.currentRoom = "dating";
//       user.completedMatches = user.completedMatches || [];
//       user.completedMatches.push(matchedUser.matchedUserId);
//       displayStatus();

//       // Listen for dateroom events (call ended)
//       await new Promise(res => {
//         const callHandler = (data: any) => {
//           if (data.type === "call_ended" && data.dateroomId === dateroomId) {
//             socket.off(`dateroom:${dateroomId}`, callHandler);
//             res(null);
//           }
//         };
//         socket.on(`dateroom:${dateroomId}`, callHandler);
//       });

//       // Step 4: Leave dating room, go back to waiting
//       user.currentRoom = null;
//       displayStatus();
//       await new Promise(res => setTimeout(res, 500)); // small delay before rejoining
//     }

//     // Loop finished for this user
//     socket.disconnect();
//   };

//   // Start all user loops in parallel
//   await Promise.all(users.map((u, idx) => userLoop(u, sockets[idx])));

//   console.log("✅ All users finished live scenario.");
// };
