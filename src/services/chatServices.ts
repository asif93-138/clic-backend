import mongoose from "mongoose";
import Chat from "../models/chat";
import Messages from "../models/message";
import ChatMetadata from "../models/chatMetadata";
import User from "../models/user.model";
import Event from '../models/event';

export function mongooseIDConversion(id: string) {
  return new mongoose.Types.ObjectId(id);
}

export function mongooseIDArrayConversion(arr: string[]) {
  return arr.map(x => new mongoose.Types.ObjectId(x));
}

export async function insertDirectChat(data: any) {
  data.participants = mongooseIDArrayConversion(data.participants);
  const chatResult = await Chat.create(data);
  const cMResult = await ChatMetadata.create({
    chatId: chatResult._id, mutedBy: []
  });
  return { chatResult, cMResult };
}

export async function insertGroupChat(data: any, name: string) {
  data.event_id = mongooseIDConversion(data.event_id);
  const chatResult = await Chat.create(data);
  const cMResult = await ChatMetadata.create({
    chatId: chatResult._id, name: name, mutedBy: []
  });
  return { chatResult, cMResult };
}

export async function updateChatParticipants(data: any) {
  data.event_id = mongooseIDConversion(data.event_id);
  data.user_id = mongooseIDConversion(data.user_id);
  const chatResult = await Chat.findOneAndUpdate({ event_id: data.event_id },
    {
      $addToSet: {
        participants: data.user_id,
      },
    },
    { upsert: true });
  return chatResult;
}

// export async function insertMessages(data: any) {
//   data.message.readBy = mongooseIDArrayConversion(data.message.readBy);
//   data.message.chatId = mongooseIDConversion(data.message.chatId);
//   data.message.senderId = mongooseIDConversion(data.message.senderId);

//   // 1️⃣ Create the message
//   const chatResult = await Messages.create(data.message);

//   // 2️⃣ Use server time to update the chat safely
//   const now = new Date(); // <-- server time

//   const updateChat = await Chat.findOneAndUpdate(
//     {
//       _id: data.message.chatId,
//       $or: [
//         { lastMessageTime: { $lt: now } },
//         { lastMessageTime: { $exists: false } },
//       ],
//     },
//     {
//       $set: {
//         lastMessageId: chatResult._id,
//         lastMessageTime: now,
//         lastMessage: data.message.text,
//         lastMessageSender: data.lastMessage_sender
//       },
//     },
//     { new: true }
//   );

//   return { chatResult, updateChat };
// }


export async function fetchInbox({
  userId,
  limit = 20,
  cursor,
}: {
  userId: string;
  limit?: number;
  cursor?: Date;
}) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const pipeline: any[] = [
    {
      $match: {
        participants: userObjectId,
      },
    },

    /* effective time fallback */
    {
      $addFields: {
        effectiveTime: {
          $ifNull: ["$lastMessageTime", "$updatedAt"],
        },
      },
    },

    ...(cursor ? [{ $match: { effectiveTime: { $lt: cursor } } }] : []),

    { $sort: { effectiveTime: -1 } },
    { $limit: limit },

    /* metadata */
    {
      $lookup: {
        from: "chatmetadatas",
        localField: "_id",
        foreignField: "chatId",
        as: "metadata",
      },
    },
    {
      $unwind: {
        path: "$metadata",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* muted + disconnected */
    {
      $addFields: {
        muted: {
          $in: [userObjectId, "$metadata.mutedBy"],
        },
        disconnected: {
          $in: [userObjectId, "$metadata.disconnectedBy"],
        },
      },
    },

    /* event (group chat) */
    {
      $lookup: {
        from: "events",
        localField: "event_id",
        foreignField: "_id",
        as: "event",
      },
    },
    {
      $unwind: {
        path: "$event",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* other user (direct chat) */
    {
      $addFields: {
        otherUserId: {
          $cond: [
            { $eq: ["$type", "direct"] },
            {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$participants",
                    as: "p",
                    cond: { $ne: ["$$p", userObjectId] },
                  },
                },
                0,
              ],
            },
            null,
          ],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "otherUserId",
        foreignField: "_id",
        as: "otherUser",
      },
    },
    {
      $unwind: {
        path: "$otherUser",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* last message */
    {
      $lookup: {
        from: "messages",
        localField: "lastMessageId",
        foreignField: "_id",
        as: "lastMessageObj",
      },
    },
    {
      $unwind: {
        path: "$lastMessageObj",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* last message sender */
    {
      $lookup: {
        from: "users",
        localField: "lastMessageObj.senderId",
        foreignField: "_id",
        as: "lastMessageSenderUser",
      },
    },
    {
      $unwind: {
        path: "$lastMessageSenderUser",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* read flag */
    {
      $addFields: {
        read: {
          $cond: [
            {
              $and: [
                { $ifNull: ["$lastMessageObj", false] },
                { $in: [userObjectId, "$lastMessageObj.readBy"] },
              ],
            },
            true,
            false,
          ],
        },
      },
    },

    /* final shape */
    {
      $project: {
        _id: 1,
        type: 1,

        name: {
          $cond: [
            { $eq: ["$type", "group"] },
            "$event.title",
            "$otherUser.userName",
          ],
        },

        imgURL: {
          $cond: [
            { $eq: ["$type", "group"] },
            "$event.imgURL",
            "$otherUser.imgURL",
          ],
        },

        lastMessage: {
          $cond: [
            { $ifNull: ["$lastMessage", false] },
            "$lastMessage",
            "$$REMOVE",
          ],
        },

        /* ✅ NEW FIELD */
        lastMessageType: {
          $cond: [
            { $ifNull: ["$lastMessageObj.type", false] },
            "$lastMessageObj.type",
            "$$REMOVE",
          ],
        },

        lastMessageSender: {
          $cond: [
            { $eq: ["$lastMessageObj.senderId", userObjectId] },
            "me",
            "$lastMessageSenderUser.userName",
          ],
        },

        lastMessageTime: "$effectiveTime",

        muted: 1,
        disconnected: 1,
        read: 1,

        effectiveTime: 1,
      },
    },
  ];

  const chats = await Chat.aggregate(pipeline);

  let nextCursor: Date | null = null;
  if (chats.length === limit) {
    nextCursor = chats[chats.length - 1].effectiveTime;
  }

  const data = chats.map(({ effectiveTime, ...rest }) => rest);

  return {
    data,
    nextCursor,
  };
}



export async function fetchMessages({
  chatId,
  limit = 30,
  cursor,
}: {
  chatId: string;
  limit?: number;
  cursor?: Date;
}) {
  const chatObjectId = new mongoose.Types.ObjectId(chatId);

  const match: any = {
    chatId: chatObjectId,
  };

  if (cursor) {
    match.createdAt = { $lt: cursor };
  }

  const messages = await Messages.aggregate([
    { $match: match },

    { $sort: { createdAt: -1 } },
    { $limit: limit },

    /* ───────── EVENT LOOKUP (conditional) ───────── */
    {
      $lookup: {
        from: "events",
        localField: "event_id",
        foreignField: "_id",
        as: "eventData",
      },
    },
    {
      $unwind: {
        path: "$eventData",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ───────── SHAPE RESPONSE ───────── */
    {
      $project: {
        _id: 1,
        chatId: 1,
        senderId: 1,

        type: 1,
        text: 1,
        data: 1,
        media: 1,
        readBy: 1,
        createdAt: 1,

        /* ✅ only included if event exists */
        eventData: {
          $cond: [
            { $ifNull: ["$eventData._id", false] },
            {
              _id: "$eventData._id",
              title: "$eventData.title",
              imgURL: "$eventData.imgURL",
            },
            "$$REMOVE",
          ],
        },
      },
    },

    /* return oldest → newest for UI */
    { $sort: { createdAt: 1 } },
  ]);

  /* cursor logic */
  let nextCursor: Date | null = null;
  if (messages.length === limit) {
    nextCursor = messages[0]?.createdAt ?? null;
  }

  return {
    messages,
    nextCursor,
  };
}



export async function fetchChatMetadata({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const chatObjectId = new mongoose.Types.ObjectId(chatId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  /* ───────── chat core ───────── */
  const chat = await Chat.findById(
    chatObjectId,
    "type event_id participants"
  ).lean();
  if (!chat) throw new Error("Chat not found");

  /* ───────── metadata ───────── */
  const chatMeta = await ChatMetadata.findOne(
    { chatId: chatObjectId },
    "name mutedBy disconnectedBy"
  ).lean();

  /* ───────── participants ───────── */
  const users = await User.find(
    { _id: { $in: chat.participants } },
    "userName imgURL"
  ).lean();

  const participants = users.map((u) => ({
    _id: u._id,
    name: u.userName,
    img: u.imgURL,
  }));

  /* ───────── identify opposite user (direct) ───────── */
  const otherUser =
    chat.type === "direct"
      ? participants.find(
          (p) => p._id.toString() !== userObjectId.toString()
        )
      : null;

  let img: string | null = null;

  /* ───────── group chat logic ───────── */
  if (chat.type === "group" && chat.event_id) {
    const event = await Event.findById(chat.event_id, "imgURL").lean();
    img = event?.imgURL ?? null;
  }

  /* ───────── direct chat logic ───────── */
  if (chat.type === "direct") {
    img = otherUser?.img ?? null;
  }

  /* ───────── FINAL RESPONSE ───────── */
  return {
    chatId,
    name:
      chat.type === "group"
        ? chatMeta?.name ?? null
        : otherUser?.name ?? null,
    img,
    type: chat.type,
    mutedBy: chatMeta?.mutedBy ?? [],

    /* ✅ NEW */
    disconnectedBy: chatMeta?.disconnectedBy ?? [],

    participants,
  };
}


