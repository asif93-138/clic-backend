import { eventLeaving, leaveDatingRoom } from "../controllers/eventLiveControllers";
import { io } from "../server";

async function disconnectUser(event_id: any, user: any) {
  await leaveDatingRoom(event_id, user.user_id, true);
  await eventLeaving({ event_id, user });
}

export function socketInit() {
io.on("connection", (socket: any) => {
  const event_id = socket.handshake.query.event_id;
  const user_id = socket.handshake.query.user_id;
  const gender = socket.handshake.query.gender;
  const interested = socket.handshake.query.interested;
  socket.event_id = event_id;
  socket.user_id = user_id;
  socket.gender = gender;
  socket.interested = interested;

  socket.on("disconnect", () => {
    const event_id = socket.event_id;
    const user_id = socket.user_id;
    const gender = socket.gender;
    const interested = socket.interested;
    disconnectUser(event_id, { user_id, gender, interested });
  });
});
}