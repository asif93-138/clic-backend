import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  data : { type: Object, required: true },
  read: {type: Boolean, required: true, default: false}
},
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
