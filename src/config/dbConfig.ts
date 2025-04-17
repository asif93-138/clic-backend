import mongoose from "mongoose";

export const MONGO_URI = "mongodb://localhost:27017/clicDB";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Local Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;

// mongodb+srv://clic-db-manager:NSNiWLSqsy0nOniw@cluster0.iuweya4.mongodb.net/clicDB?retryWrites=true&w=majority&appName=Cluster0
