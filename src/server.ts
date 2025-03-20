import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import connectDB from "./config/dbConfig";
import initialController from "./controllers/initialController";
import { createUser, checkUsers, getAllUsers, getUser, updateUser, getUserApproved, getUserPP, getUserProfile  } from "./controllers/userController";
import { userLogin } from "./controllers/loginController";
import { adminLogin } from "./controllers/adminController";
import { applyEvent, approveEventUser, createEvent, getAllEvents, getEvent, getEventApplicationAndApproval, getEventForApp, getUserPool, updateEvent } from "./controllers/eventController";
import authMiddleware from "./middleware/auth";
import citiesSearchController from "./controllers/citiesSearchController";
import interestsSearchController from "./controllers/interestsSearchController";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT as string, 10) || 5000;
const upload = multer({ dest: 'uploads/' }); // Temporary storage before uploading to cloudinary

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json()); 
app.use(cors());

// Connect to MongoDB
connectDB();

// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins
    methods: ["GET", "POST"],
  },
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
  
    socket.on("message", (data) => {
      console.log("Message received:", data);
      io.emit("message", data); // Broadcast message to all clients
    });
  
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

app.get("/", initialController);
app.get("/users", authMiddleware, getAllUsers);
app.get("/user", authMiddleware, getUser);
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
app.get("/eventUsersApplicationAndApproval", authMiddleware, getEventApplicationAndApproval);

app.post("/register", upload.single('profilePicture'), createUser);
app.post("/event", authMiddleware, upload.single('eventBanner'), createEvent);
app.post("/login", userLogin);
app.post("/admin", adminLogin);
app.post("/applyEvent", authMiddleware, applyEvent);
app.post("/eventUserApproval", authMiddleware, approveEventUser);

app.put("/user/:id", authMiddleware, updateUser);
app.put("/event/:id", authMiddleware, updateEvent);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
