import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/dbConfig";
import initialController from "./controllers/initialController";
import {
  createUser, checkUsers, getAllUsers, getUser, updatePass,
  getUserApproved, getUserPP, getUserProfile, sendEmailC, pushNotificationUpdate,
  pushNotificationTest, emailVerificationC, matchVerificationCode, updateUser,
  getUserData, searchUser, updateUserApp, getInvites, updateInvite, getInvitesBanner,
  interestedMatchC,
} from "./controllers/userController";
import { userLogin } from "./controllers/loginController";
import {
  adminDataEvent,
  adminEventDetails, adminLogin, deleteUnreadNotifications,
  getAllNotifications, notificationCount, readNotification, registerInvites,
} from "./controllers/adminController";
import {
  applyEvent, approveEventUser,
  createEvent, deletePhoto, eventUserStatus, eventUserStatusAdmin, getAllEvents,
  getEvent, getEventForApp, getFutureEvents, getUserPool, getWaitingList,
  homePageData, rejectEventUser, sendBulkInvitations, updateEvent, uploadTesting,
} from "./controllers/eventController";
import authMiddleware from "./middleware/auth";
import citiesSearchController from "./controllers/citiesSearchController";
import interestsSearchController from "./controllers/interestsSearchController";
import http from "http";
import { Server } from "socket.io";
import { upload } from "./middleware/multerConfig";
import agenda from "./config/agenda";
import defineNotificationJob from "./jobs/sendNotification";
import collectFeedback from "./controllers/feedbackCollection";
import { socketInit } from "./utils/socketIOSetup";
import { eventJoining, eventLeavingC, extensionC, leaveDatingC, leaveDatingSessionC } from "./controllers/eventLiveControllers";
import { doUpload } from "./middleware/spaces";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT as string, 10);

app.use(express.json());
app.use(cors());

// Connect to MongoDB
if (process.argv[2] == "test") connectDB(true);
else connectDB();

// Register Agenda job
defineNotificationJob(agenda);

// Start Agenda
(async () => {
  agenda.on("ready", async () => {
    await agenda.start();
  });
})();

export const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins
    methods: ["GET", "POST"],
  },
});
socketInit();

app.get("/", initialController);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.get("/users", authMiddleware, getAllUsers);
app.get("/user", authMiddleware, getUser);
app.get("/user-data/:id", authMiddleware, getUserData);
app.get("/userProfilePicture", authMiddleware, getUserPP);
app.get("/events", authMiddleware, getAllEvents);
app.get("/event/:id", authMiddleware, getEvent);
app.get("/eventForApp/:id", authMiddleware, getEventForApp);
app.get("/user_approved", authMiddleware, getUserApproved);
app.get("/userProfile", authMiddleware, getUserProfile);
app.get("/checkUser", checkUsers);
app.get("/cities", citiesSearchController);
app.get("/interests", interestsSearchController);
app.get("/userPools", authMiddleware, getUserPool);
app.get("/eventUserStatus/:id", authMiddleware, eventUserStatus);
app.get("/eventUserStatus-admin", authMiddleware, eventUserStatusAdmin);
app.get("/notification-test", pushNotificationTest);
app.get("/home-page", authMiddleware, homePageData);
app.get("/admin-event-level-data", authMiddleware, adminDataEvent);
app.get("/admin-date-level-data/:id", authMiddleware, adminEventDetails);
app.get("/unread-notification-count", authMiddleware, notificationCount);
app.get("/notifications", authMiddleware, getAllNotifications);
app.get("/invites", authMiddleware, getInvites);
app.get("/invites-banner", authMiddleware, getInvitesBanner);
app.get("/search-user", authMiddleware, searchUser);
app.get("/future-events-website", getFutureEvents);
app.get("/waiting-list/:id", authMiddleware, getWaitingList);
app.get("/healthh", async(req, res) => {
  res.send("OK");
});

app.post("/register", upload.single("profilePicture"), doUpload, createUser);
app.post("/event", authMiddleware, upload.single("eventBanner"), doUpload, createEvent);
app.post("/login", userLogin);
app.post("/admin", adminLogin);
app.post("/eventActionUpdate", authMiddleware, applyEvent);
app.post("/eventUserApproval", authMiddleware, approveEventUser);
app.post("/eventUserReject", authMiddleware, rejectEventUser);
app.post( "/testUpload", authMiddleware, upload.single("testUpload"), doUpload, uploadTesting);
app.post("/sendEmail", authMiddleware, sendEmailC);
app.post("/send-invitation-mails", authMiddleware, sendBulkInvitations);
app.post("/email-verification-code", emailVerificationC);
app.post("/match-verification-code", matchVerificationCode);
app.post("/notification-register", authMiddleware, pushNotificationUpdate);
app.post("/submitFeedback", collectFeedback);
app.post("/mark-notification-read/:id", authMiddleware, readNotification);
app.post("/invite", authMiddleware, registerInvites);
app.post("/interested", authMiddleware, interestedMatchC);

app.post("/join", eventJoining);

app.put("/reset_pass", updatePass);
app.put("/user/:id", authMiddleware, updateUser);
app.put("/invite-interaction/:id", authMiddleware, updateInvite);
app.put("/user-app", authMiddleware, upload.single("profilePicture"), doUpload, updateUserApp);
app.put("/event/:id", authMiddleware, upload.single("eventBanner"), doUpload, updateEvent);

app.put("/leaveDatingRoom", leaveDatingC);
app.put("/extend", extensionC);
app.put("/leaveDatingSession", leaveDatingSessionC);

app.delete("/deletePhoto", authMiddleware, deletePhoto);
app.delete("/delete-unread-notifications", authMiddleware,deleteUnreadNotifications
);

app.delete("/leave_event", eventLeavingC);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
// (async function() {

// })();
