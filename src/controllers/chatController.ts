import { Request, Response } from 'express';
import { fetchChatMetadata, fetchInbox, fetchMessages, insertDirectChat, insertGroupChat } from '../services/chatServices';
import { userSocketMap } from '../utils/socketIOSetup';
import { io } from '../server';
import Messages from '../models/message';
import mongoose from 'mongoose';
import Chat from '../models/chat';
import ChatMetadata from '../models/chatMetadata';
import Event from '../models/event';

export async function createDirectChat(req: Request, res: Response) {
    const result = await insertDirectChat(req.body);
    res.json(result);
}

export async function createGroupChat(req: Request, res: Response) {
    const result = await insertGroupChat(req.body.data, req.body.eventTitle);
    res.json(result);
}

// export async function sendMessages(req: Request, res: Response) {
//     const result = await insertMessages(req.body);
//     res.json(result);
// }

export async function getInbox(req: any, res: Response) {
    const data: { userId: string, limit: number, cursor: Date } = {
        userId: req.user, limit: req.query.limit, cursor: new Date()
    };
    const result = await fetchInbox(data);
    res.json(result);
}

export async function getChatDetails(req: any, res: Response) {
    const data: { chatId: string, userId: string, limit: number, cursor: Date } = {
        chatId: req.params.chatId, userId: req.user, limit: 30, cursor: req.query.cursor ?? new Date()
    };
    const result = await fetchMessages(data);
    res.json(result);
}

export async function connectChatRoom(req: any, res: Response) {
    console.log(userSocketMap);
    const socketId = userSocketMap.get(req.user)?.socket_id;
    const socket: any = io.sockets.sockets.get(socketId);
    console.log("ADDING TO ROOM", req.body.chatId);
    socket.join(req.body.chatId);
    res.json({ status: "connected" });
}
export async function disconnectChatRoom(req: any, res: Response) {
    console.log(userSocketMap);
    const socketId = userSocketMap.get(req.user)?.socket_id;
    console.log(req.user, socketId);
    if (socketId) {
        const socket: any = io.sockets.sockets.get(socketId);
        socket!.leave(req.body.chatId);
    }
    res.json({ status: "disconnected" });
}

export async function getChatMetadata(req: any, res: Response) {
    const chatId = req.params.chatId, userId = req.user;
    const result = await fetchChatMetadata({ chatId, userId });
    res.json(result);
}


export async function sendMessage(
    req: any,
    res: Response
): Promise<void> {
    try {
        const chatId:string = req.params.chatId;
        const senderId:string = req.user; // assume auth middleware
        const { text = "", type, media = [] } = req.body;

        if (!text && !type && (!media || media.length === 0)) {
            res.status(400).json({ message: "Message cannot be empty" });
            return
        }

        const chatObjectId = new mongoose.Types.ObjectId(chatId);
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const activeParticipants: mongoose.Types.ObjectId[] = []

        // (find and iterate all participant
        // if user is active via map check) => activeParticipants = participant[]
        const chat = await Chat.findById(chatObjectId).select("participants");
        console.log(chat?.participants)
        if (chat) {
            chat.participants.forEach((userId) => {
                //put map check here
                if (userSocketMap.has(userId.toString()) && io.sockets.adapter.rooms.get(chatId)?.has(userSocketMap.get(userId.toString())?.socket_id) && userId.toString() !== senderId) {
                    activeParticipants.push(userId)
                }

            });
        }

        // add message to messages <== participant[] as read
        const messageDoc = await Messages.create({
            chatId: chatObjectId,
            senderId: senderObjectId,
            type,
            text,
            media,
            readBy: [senderObjectId, ...activeParticipants],
        });

        const messagePayload = {
            _id: messageDoc._id.toString(),
            chatId: chatId,
            senderId: senderId.toString(),
            type,
            text: messageDoc.text || "",
            media: messageDoc.media || [],
            readBy: messageDoc.readBy.map((id) => id.toString()),
            createdAt: messageDoc.createdAt.toISOString(),
        };


        const now = new Date();
        // update chat document (lastsender)
        await Chat.findOneAndUpdate(
            {
                _id: chatObjectId,
                $or: [
                    { lastMessageTime: { $lt: now } },
                    { lastMessageTime: { $exists: false } },
                ],
            },
            {
                $set: {
                    lastMessageId: messageDoc._id,
                    lastMessage: text,
                    lastMessageSender: senderId.toString(),
                    lastMessageTime: now,
                },
            },
            { new: true }
        );
        // emit to message via room socket (chat) <== participant[] as read
        io.to(chatId).emit("message-update", messagePayload);

        const inboxPayload = {
            chatId: chatId,
            type,
            lastMessage: text,
            lastMessageSenderId: senderId.toString(),
            lastMessageTime: now.toISOString(),
        };

        // iterate activeParticipants to
        // emit inbox update
        if (chat) {

            chat.participants.forEach((userId) => {
                
                if (userSocketMap.has(userId.toString())) {
                    console.log(userId, io.sockets.adapter.rooms.get(chatId)?.has(userSocketMap.get(userId.toString())?.socket_id), io.sockets.adapter.rooms.get(chatId),  userSocketMap.get(userId.toString()))
                    io.to(userSocketMap.get(userId.toString())?.socket_id).emit(
                        "inbox-update",
                        { ...inboxPayload, read: io.sockets.adapter.rooms.get(chatId)?.has(userSocketMap.get(userId.toString())?.socket_id)}
                    );
                }


            });
        }



        //  HTTP response
        res.status(201).json({
            message: messagePayload,
        });
        return
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ message: "Internal server error" });
        return
    }
};

// (async function() {
//     // const result = await Messages.updateMany({}, {type: "text"});   
//     // console.log(result);
//     // const result = await Chat.updateMany({type: "direct"}, {disconnected: false});   
//     // console.log(result);
//     // const result = await Chat.updateMany({type: "direct"}, {$unset: {disconnected: ""}});
//     // console.log(result);
//     // const result = await ChatMetadata.updateMany({}, {disconnectedBy: []});   
//     // console.log(result);
// })();

export async function markAsRead(
    req: any,
    res: Response
): Promise<void> {
    try {
        const { chatId } = req.body;
        const readerId = req.user;

        if (!chatId) {
            res.status(400).json({ message: "chatId is required" });
            return
        }

        const chatObjectId = new mongoose.Types.ObjectId(chatId);
        const readerObjectId = new mongoose.Types.ObjectId(readerId);

        // 1️⃣ Ensure chat exists
        const chatExists = await Chat.exists({ _id: chatObjectId });
        if (!chatExists) {
            res.status(404).json({ message: "Chat not found" });
        }

        // 2️⃣ Find unread messages first (needed for socket payload)
        const unreadMessages = await Messages.find(
            {
                chatId: chatObjectId,
                readBy: { $ne: readerObjectId },
            },
            { _id: 1 }
        ).lean();

        if (unreadMessages.length === 0) {
            res.status(200).json({ success: true });
            return
        }

        const messageIds = unreadMessages.map((m) => m._id.toString());

        // 3️⃣ Bulk update — append readerId if not already present
        await Messages.updateMany(
            {
                _id: { $in: unreadMessages.map((m) => m._id) },
            },
            {
                $addToSet: { readBy: readerObjectId },
            }
        );

        // 4️⃣ Emit socket event to chat room
        io.to(chatId).emit("read-update", {
            chatId: chatId,
            readerId: readerId.toString(),
            messageIds,
        });

        res.status(200).json({ success: true });
        return
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ message: "Internal server error" });
        return
    }
};

export async function sendEventInviteByChat(req: any, res: Response) {
const chatData = await Chat.findOne({
  type: "direct",
  participants: {
    $all: [
      new mongoose.Types.ObjectId(req.user as string),
      new mongoose.Types.ObjectId(req.body.invitedUser_id as string),
    ],
  },
}, "_id");
console.log(chatData);

  const chatId = chatData?._id;
        const senderId:string = req.user; // assume auth middleware
        const text = "sent an event invitation", type = "invitation", media:any = [];
        

        if (!text && !type && (!media || media.length === 0)) {
            res.status(400).json({ message: "Message cannot be empty" });
            return
        }

        const chatObjectId = chatId
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const activeParticipants: mongoose.Types.ObjectId[] = []

        // (find and iterate all participant
        // if user is active via map check) => activeParticipants = participant[]
        const chat = await Chat.findById(chatObjectId).select("participants");
        console.log(chat?.participants)
        if (chat) {
            chat.participants.forEach((userId) => {
                //put map check here
                if (userSocketMap.has(userId.toString()) && io.sockets.adapter.rooms.get(chatId!.toString())?.has(userSocketMap.get(userId.toString())?.socket_id) && userId.toString() !== senderId) {
                    activeParticipants.push(userId)
                }

            });
        }

        // add message to messages <== participant[] as read
        const messageDoc = await Messages.create({
            chatId: chatObjectId,
            senderId: senderObjectId,
            type,
            event_id: new mongoose.Types.ObjectId(req.body.event_id as string),
            text,
            media,
            readBy: [senderObjectId, ...activeParticipants],
        });

        const eventData = await Event.findById(req.body.event_id, "title imgURL");

        const messagePayload = {
            _id: messageDoc._id.toString(),
            chatId: chatId,
            senderId: senderId.toString(),
            type,
            eventData,
            text: messageDoc.text || "",
            media: messageDoc.media || [],
            readBy: messageDoc.readBy.map((id) => id.toString()),
            createdAt: messageDoc.createdAt.toISOString(),
        };


        const now = new Date();
        // update chat document (lastsender)
        await Chat.findOneAndUpdate(
            {
                _id: chatObjectId,
                $or: [
                    { lastMessageTime: { $lt: now } },
                    { lastMessageTime: { $exists: false } },
                ],
            },
            {
                $set: {
                    lastMessageId: messageDoc._id,
                    lastMessage: text,
                    lastMessageSender: senderId.toString(),
                    lastMessageTime: now,
                },
            },
            { new: true }
        );
        // emit to message via room socket (chat) <== participant[] as read
        io.to(chatId!.toString()).emit("message-update", messagePayload);

        const inboxPayload = {
            chatId: chatId,
            type,
            lastMessage: text,
            lastMessageSenderId: senderId.toString(),
            lastMessageTime: now.toISOString(),
        };

        // iterate activeParticipants to
        // emit inbox update
        if (chat) {

            chat.participants.forEach((userId) => {
                
                if (userSocketMap.has(userId.toString())) {
                    console.log(userId, io.sockets.adapter.rooms.get(chatId!.toString())?.has(userSocketMap.get(userId.toString())?.socket_id), io.sockets.adapter.rooms.get(chatId!.toString()),  userSocketMap.get(userId.toString()))
                    io.to(userSocketMap.get(userId.toString())?.socket_id).emit(
                        "inbox-update",
                        { ...inboxPayload, read: io.sockets.adapter.rooms.get(chatId!.toString())?.has(userSocketMap.get(userId.toString())?.socket_id)}
                    );
                }


            });
        }

        //  HTTP response
        res.status(201).json({
            message: messagePayload,
        });
}