import jwt from "jsonwebtoken";
import { disconnectUser } from "../controllers/eventLiveControllers";
import { io } from "../server";

export const userSocketMap = new Map<string, any>();

export function socketInit() {
  io.on("connection", (socket: any) => {
    const token = socket.handshake.query.token;
    const decodedData: any = jwt.verify(token, "default_secret");
    userSocketMap.set(decodedData.id, {socket_id: socket.id});

    socket.on("disconnect", () => {
      const token = socket.handshake.query.token;
      const decodedData: any = jwt.verify(token, "default_secret");
      const user_id = decodedData.id;
      const socketObj = userSocketMap.get(user_id);
      if (socketObj.event_id) {
        const gender = socketObj.gender, interested = socketObj.interested;
        disconnectUser(socketObj.event_id, { user_id, gender, interested });
      }
      userSocketMap.delete(user_id);
    });
  });
}