# Chat Functionality Specification Sheet

**Version:** 1.0  
**Date:** February 7, 2026  
**Technology Stack:** Express.js (TypeScript), Socket.IO, MongoDB (Mongoose), Node.js

---

## 1. Executive Summary

The chat system implements a real-time messaging platform with support for two chat types:
- **Direct Chats**: One-to-one conversations between two users
- **Group Chats**: Event-based group conversations for event participants

The system uses WebSocket (Socket.IO) for real-time message delivery and MongoDB for persistent storage, with optimized indexing for inbox operations.

---

## 2. Chat Types & Creation Flows

### 2.1 Group Chat (Event-based)

**Creation Trigger:** When an event is created

**Flow:**
```
Event Creation (createEvent) 
  → Creates Chat document with type: "group"
  → Creates ChatMetadata document with event name
```

**Participants Addition:**
- Users are added to group chat participants when their RSVP request is approved
- Triggered by: `approveEventUser` controller
- Operation: Adds user ID to Chat.participants array

**Key Characteristics:**
- Account-wide visibility across all approved participants
- Chat metadata includes event name
- Participants can be added incrementally as RSVPs are approved

### 2.2 Direct Chat (User-to-User)

**Creation Trigger:** When a couple clicks/matches during a live event

**Flow:**
```
Call/Click Registered (updateClics in event)
  → When both users "clic" (match), a direct chat is auto-created
  → Creates Chat document with type: "direct"
  → Creates ChatMetadata document (no name for direct chats)
```

**Participants:**
- Fixed to exactly 2 users
- No post-creation participant modifications

**Key Characteristics:**
- Ephemeral nature (can be disconnected by users)
- Can be muted by individual participants
- Tracks disconnection state via ChatMetadata.disconnectedBy

---

## 3. Data Models

### 3.1 Chat Model

**Collection:** `chats`

```typescript
{
  type: "direct" | "group",                    // Chat type identifier
  participants: [ObjectId],                     // Array of User IDs
  event_id?: ObjectId,                          // References Event (group chats only)
  lastMessageId?: ObjectId,                     // Reference to last message sent
  lastMessage?: string,                         // Text preview of last message
  lastMessageSender?: string,                   // User ID of message sender
  lastMessageTime?: Date,                       // Timestamp of last message
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ type: 1, participants: 1 }` - Critical for inbox queries
- `{ participants: 1, lastMessageTime: -1 }` - Sorting inbox by recency
- `{ chatId: 1, createdAt: -1 }` (on Messages model)

### 3.2 ChatMetadata Model

**Collection:** `chatmetadata`

```typescript
{
  chatId: ObjectId,                    // Unique reference to Chat (required)
  name?: string,                       // Group name (null for direct chats)
  mutedBy: [ObjectId],                 // Users who have muted this chat
  disconnectedBy: [ObjectId],          // Users who have disconnected (direct chats)
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose:**
- Stores metadata that doesn't affect message delivery
- Tracks user preferences (mute, disconnect status)
- Enables selective user actions without affecting other participants

### 3.3 Message Model

**Collection:** `messages`

```typescript
{
  chatId: ObjectId,                    // Reference to Chat (required)
  senderId: ObjectId,                  // User who sent the message (required)
  type: "text" | "photo" | "audio" | 
        "video" | "invitation",        // Message type (default: "text")
  event_id?: ObjectId,                 // For invitation type messages
  text?: string,                       // Message content
  media: [{ url: string, type: string }], // Array of media objects
  readBy: [ObjectId],                  // Users who have read the message
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ chatId: 1, createdAt: -1 }` - Messages ordered by chat and time
- `{ chatId: 1, senderId: 1 }` - Find messages by sender in a chat
- `{ readBy: 1 }` - Find read receipts efficiently

**Special Features:**
- **Read Receipts:** `readBy` array automatically includes sender and active participants
- **Message Types:** Supports text, media, and special invitation type
- **Event References:** Invitation messages can reference events

---

## 4. Controllers & API Endpoints

### 4.1 Chat Management

#### `createDirectChat` (POST)
- **Purpose:** Explicitly create a direct chat between two users
- **Request Body:** `{ participants: [userId1, userId2] }`
- **Response:** Chat and ChatMetadata documents
- **Note:** Auto-created on click/match; manual creation also supported

#### `createGroupChat` (POST)
- **Purpose:** Create a group chat for an event
- **Request Body:** `{ data: ChatData, eventTitle: string }`
- **Response:** Chat and ChatMetadata documents
- **Note:** Primarily called during event creation

---

### 4.2 Message Operations

#### `sendMessage` (POST `/chat/:chatId/message`)
- **Purpose:** Send a message to a specific chat
- **Authentication:** Required (via auth middleware)
- **Request Body:**
  ```json
  {
    "text": "Message content",
    "type": "text",        // or "photo", "audio", "video"
    "media": [],           // Optional media array
    "event_id": "optional" // For event invites
  }
  ```
- **Response:** `{ message: MessagePayload }`
- **Behavior:**
  - Saves message to Messages collection
  - Marks as read for sender and active participants only
  - Updates Chat.lastMessage* fields
  - Emits real-time events via Socket.IO

#### `sendEventInviteByChat` (POST)
- **Purpose:** Send an event invitation through direct chat
- **Request Body:** `{ invitedUser_id: string, event_id: string }`
- **Message Type:** "invitation"
- **Behavior:**
  - Creates special invitation-type message
  - Finds/creates direct chat between sender and recipient
  - Includes event metadata in message payload

#### `markAsRead` (POST)
- **Purpose:** Mark all unread messages in a chat as read by the user
- **Request Body:** `{ chatId: string }`
- **Behavior:**
  - Bulk updates Messages.readBy array
  - Emits read-update event to chat room
  - Optimized to skip if all messages already read

---

### 4.3 Inbox & Chat Retrieval

#### `getInbox` (GET)
- **Purpose:** Load initial inbox page data
- **Query Parameters:**
  - `limit`: Items per page (default: 20)
  - `cursor`: Pagination cursor (Date timestamp)
- **Response:** Array of chats with last message preview
- **Implementation:** Cursor-based pagination using lastMessageTime
- **Optimization:** Indexes ensure efficient sorting

#### `getChatMetadata` (GET `/chat/:chatId/metadata`)
- **Purpose:** Load metadata for a specific chat
- **Response:** ChatMetadata document (name, muted status, etc.)
- **Use Case:** Initialize chat header information

#### `getChatDetails` (GET `/chat/:chatId`)
- **Purpose:** Load messages for a specific chat
- **Query Parameters:**
  - `cursor`: Pagination cursor (Date timestamp, defaults to current time)
- **Request Parameters:** `chatId`
- **Response:** Array of messages, paginated
- **Limit:** 30 messages per request by default

#### `connectChatRoom` (POST)
- **Purpose:** Join WebSocket room for real-time updates
- **Request Body:** `{ chatId: string }`
- **Behavior:** User's socket joins Socket.IO room named chatId
- **Side Effect:** User becomes "active participant" for new messages

#### `disconnectChatRoom` (POST)
- **Purpose:** Leave WebSocket room
- **Request Body:** `{ chatId: string }`
- **Behavior:** User's socket leaves Socket.IO room

---

### 4.4 Event-Related Chat Updates

#### `createEvent` (Event Controller)
- **Chat Creation Integration:**
  - Creates group Chat document (type: "group")
  - Creates ChatMetadata document with event title
  - Returns event data with new chat IDs

#### `approveEventUser` (Event Controller)
- **Chat Participant Update:**
  - Adds approved user to Chat.participants array (group chat)
  - Allows user to receive group messages
  - Operation: `$addToSet` on participants array

#### `updateClics` (Event Live Controller)
- **Direct Chat Creation Trigger:**
  - When user2 clicks on user1 (total 2 clics)
  - Checks existing direct chat with exact participants
  - Creates new direct chat if not found
  - Initializes ChatMetadata with empty disconnectedBy array

---

## 5. Real-Time Events (Socket.IO)

### 5.1 Message Events

#### **`message-update`** (Server → Client)
- **Emitted:** When a message is sent in a chat room
- **Room:** Chat room (chatId)
- **Payload:**
  ```json
  {
    "_id": "messageId",
    "chatId": "chatId",
    "senderId": "senderId",
    "type": "text|photo|audio|video|invitation",
    "text": "message content",
    "media": [],
    "readBy": ["userId1", "userId2"],
    "createdAt": "ISO8601 timestamp",
    "eventData": { "title": "", "imgURL": "" }  // For invitations
  }
  ```

#### **`inbox-update`** (Server → Client)
- **Emitted:** When a message is sent to any chat involving the user
- **Target:** Individual user's socket
- **Payload:**
  ```json
  {
    "chatId": "chatId",
    "type": "text|invitation",
    "lastMessage": "preview text",
    "lastMessageSenderId": "userId",
    "lastMessageSenderName": "userName",
    "lastMessageTime": "ISO8601 timestamp",
    "read": boolean  // Whether user is in active chat room
  }
  ```
- **Purpose:** Updates inbox without requiring page refresh

#### **`read-update`** (Server → Client)
- **Emitted:** When a user marks messages as read
- **Room:** Chat room (chatId)
- **Payload:**
  ```json
  {
    "chatId": "chatId",
    "readerId": "userId",
    "messageIds": ["msgId1", "msgId2"]
  }
  ```

### 5.2 Call/Click Events

#### **`clic_request`** (Server → Client)
- **Emitted:** When a user receives a click/match notification
- **Target:** Other user's socket
- **Source:** updateClics controller
- **Payload:** Full Cliced document
- **Purpose:** Notifies user of incoming match during live event

---

## 6. Key Features & Behaviors

### 6.1 Read Receipts

**Implementation:**
- Message creator added to `readBy` on creation
- Active participants (in socket room) auto-added to `readBy`
- Inactive participants can mark as read via `markAsRead` endpoint

**Active Participant Determination:**
```
User is active if:
  1. User socket exists in userSocketMap
  2. User's socket is in the chat room
  3. User is not the message sender
```

**Purpose:** Efficient delivery without storing unnecessary read data

### 6.2 Last Message Optimization

**Data Cached on Chat Document:**
- `lastMessageId` - Reference to Messages document
- `lastMessage` - Text preview (denormalized for performance)
- `lastMessageSender` - User ID (string) for UI display
- `lastMessageTime` - Timestamp for sorting

**Update Condition:**
Only updates if new message is newer than existing lastMessageTime or field doesn't exist

**Benefit:** Avoids expensive message lookups during inbox queries

### 6.3 Cursor-Based Pagination

**Implementation:**
- Cursor: Date timestamp (defaults to current time)
- Direction: Historical messages/chats before cursor
- Limit: 20 for inbox, 30 for message details (configurable)

**Query Pattern:**
```
Find chats where lastMessageTime < cursor
Sort by lastMessageTime descending
Limit to N results
```

**Advantages:**
- Stable pagination (no gaps with deleted/updated messages)
- Efficient with indexes
- Works with real-time data

### 6.4 Chat Disconnection (Direct Chats Only)

**Purpose:** Soft delete for direct chats without removing message history

**Mechanism:**
- ChatMetadata.disconnectedBy array tracks users who disconnected
- Both users can independently disconnect
- When both disconnect, chat becomes invisible to both

**Reconnection:** Creating a clic again re-activates the chat

---

## 7. Message Flow Diagrams

### 7.1 Direct Chat Creation Flow

```
User A clicks User B in Live Event
         ↓
updateClics (add to Clics document)
         ↓
When clics.length === 2:
         ↓
Query existing direct chat with both participants
         ↓
    ┌─── Chat Exists? ──┐
    │                   │
   YES                  NO
    │                   │
    │              Create Chat
    │              Create ChatMetadata
    │                   │
    └─────────┬─────────┘
              ↓
          Emit "clic_request" to other user
              ↓
Direct chat ready for messaging
```

### 7.2 Message Send Flow

```
Client sends message
         ↓
POST /chat/:chatId/message
         ↓
Authenticate user
         ↓
Create Messages document (with readBy = [sender, activeParticipants])
         ↓
Update Chat.lastMessage* fields
         ↓
    ┌────────────────────────────────────┐
    │   Fork: Real-time notifications    │
    │                                    │
    ├─→ socket.io.to(chatId).emit       ├─→ Emit "message-update"
    │   (message room subscribers)       │  (active chat participants)
    │                                    │
    ├─→ For each chat participant:      ├─→ Emit "inbox-update"
    │   socket.io.to(userId).emit       │  (all participants for inbox)
    │                                    │
    └────────────────────────────────────┘
              ↓
Return HTTP 201 with message payload
```

### 7.3 Group Chat Creation Flow

```
Event Creation (createEvent)
         ↓
Create Event document
         ↓
Create Chat document:
  - type: "group"
  - event_id: eventId
  - participants: [] (empty initially)
         ↓
Create ChatMetadata:
  - chatId reference
  - name: eventTitle
         ↓
Event ready for RSVPs → participants added incrementally via approveEventUser
```

---

## 8. User Actions & State Management

### 8.1 Mute Chat

**Storage:** ChatMetadata.mutedBy array
**Action:** User ID added to mutedBy
**Effect:** Client-side - suppress notifications (server doesn't enforce)
**Reversibility:** Can be toggled by removing user from array

### 8.2 Disconnect Chat (Direct Chats)

**Storage:** ChatMetadata.disconnectedBy array
**Action:** User ID added to disconnectedBy
**Effect:** Chat hidden from inbox for that user
**Reversibility:** Creating a new clic with same user removes from array

### 8.3 Mark as Read

**Endpoint:** POST `markAsRead`
**Operation:** Bulk update Messages.readBy array
**Scope:** All unread messages in a chat
**Optimization:** Skips if already read

---

## 9. Database Indexing Strategy

| Model | Index | Purpose |
|-------|-------|---------|
| Chat | `{ type: 1, participants: 1 }` | Filter chats by type and user |
| Chat | `{ participants: 1, lastMessageTime: -1 }` | Inbox sorting & pagination |
| Message | `{ chatId: 1, createdAt: -1 }` | Message retrieval by chat |
| Message | `{ chatId: 1, senderId: 1 }` | Find user's messages in chat |
| Message | `{ readBy: 1 }` | Query read receipts |

**Impact:** These indexes enable O(log n) lookups on critical queries

---

## 10. Error Handling & Edge Cases

### 10.1 Handled Edge Cases

| Case | Handling |
|------|----------|
| Empty message sent | HTTP 400 - "Message cannot be empty" |
| Chat not found | HTTP 404 - "Chat not found" |
| User not in chat | Implicitly excluded from real-time events |
| Message older than last message | Last message not updated (atomic condition) |
| User offline during send | Message created; read receipt skipped |
| Socket disconnection | User removed from active participants |

### 10.2 Race Condition Handling

**Last Message Update:**
- Uses MongoDB conditional update: `{ lastMessageTime: { $lt: now } || $exists: false }`
- Prevents older messages from overwriting newer ones
- Atomic at database level

---

## 11. Performance Considerations

### 11.1 Optimization Techniques

1. **Cursor-based Pagination** - Avoids offset skipping
2. **Message Preview Caching** - Denormalized lastMessage on Chat
3. **Read Receipt Batching** - Bulk updates on markAsRead
4. **Socket Room Targeting** - Direct socket emissions instead of broadcasts
5. **Indexed Queries** - All critical paths use indexes

### 11.2 Potential Bottlenecks

1. **Large Participant Groups** - forEach loop in sendMessage (consider aggregation)
2. **Read Declaration in Messages** - readBy array grows unbounded (consider TTL)
3. **Inbox Query Under Load** - May need pagination optimization with larger datasets

---

## 12. Security & Access Control

### 12.1 Current Protections

- **Authentication:** All endpoints require `req.user` (auth middleware)
- **Implicit Authorization:** Only messages in user's chats visible

### 12.2 Recommended Enhancements

- Explicit authorization checks (verify user is chat participant)
- Rate limiting on message sends
- Input validation on message content
- Media upload validation for security

---

## 13. Future Enhancement Opportunities

1. **Typing Indicators** - Send "user is typing" events
2. **Message Reactions** - Emoji reactions to messages
3. **Forwarded Messages** - Forward existing messages to other chats
4. **Message Deletion** - Soft delete with "message deleted" placeholder
5. **Group Admin Roles** - For event chats (remove members, edit name)
6. **Message Search** - Full-text search across chat history
7. **Media Upload Progress** - Real-time upload status
8. **Edited Messages** - Track message edits with timestamps

---

## 14. API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chat/inbox` | GET | Load user's inbox |
| `/chat/:chatId` | GET | Load messages in chat |
| `/chat/:chatId/metadata` | GET | Load chat metadata |
| `/chat/:chatId/message` | POST | Send message |
| `/chat/:chatId/connect` | POST | Join chat room (WebSocket) |
| `/chat/:chatId/disconnect` | POST | Leave chat room |
| `/chat/read` | POST | Mark messages as read |
| `/chat/create-direct` | POST | Create direct chat |
| `/chat/create-group` | POST | Create group chat |
| `/chat/send-event-invite` | POST | Send event invitation |

---

## 15. Deployment Notes

- **WebSocket Requirement:** Socket.IO server must be running
- **MongoDB Connection:** Ensure proper connection string and auth
- **User Socket Map:** In-memory; resets on server restart
- **Cluster Mode:** Current implementation uses in-memory map (single instance)
  - For multi-instance: Consider Redis for socket map persistence

---

**Document End**
