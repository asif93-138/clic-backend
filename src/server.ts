import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import connectDB from "./config/dbConfig";
// import initialController from "./initialController";
import { createUser, checkUsers, getAllUsers, getUser, updateUser  } from "./controllers/userController";
import { userLogin } from "./controllers/loginController";
import { adminLogin } from "./controllers/adminController";
import { createEvent, getAllEvents, getEvent, updateEvent } from "./controllers/eventController";
import authMiddleware from "./middleware/auth";
import citiesSearchController from "./controllers/citiesSearchController";
import interestsSearchController from "./controllers/interestsSearchController";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT as string, 10) || 5000;
const upload = multer({ dest: 'uploads/' }); // Temporary storage before uploading to cloudinary

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json()); 
app.use(cors());

// Connect to MongoDB
connectDB();

// app.get("/", initialController);
app.get("/users", authMiddleware, getAllUsers);
app.get("/user/:id", authMiddleware, getUser);
app.get("/events", authMiddleware, getAllEvents);
app.get("/event/:id", authMiddleware, getEvent);
app.get("/checkUser", checkUsers);
app.get("/cities", citiesSearchController);
app.get("/interests", interestsSearchController);
app.post("/register", upload.single('profilePicture'), createUser);
app.post("/event", authMiddleware, upload.single('eventBanner'), createEvent);
app.post("/login", userLogin);
app.post("/admin", adminLogin);
app.put("/user/:id", authMiddleware, updateUser);
app.put("/event/:id", authMiddleware, updateEvent);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
