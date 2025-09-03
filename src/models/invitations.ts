import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema({
    event_id: { type: String, required: true },
    title: { type: String, required: true },
    user_id: { type: String, required: true },
    userName: { type: String, required: true },
    user_imgURL: { type: String, required: true },
    status: { type: String, required: true }
},
    { timestamps: true }
);

export default mongoose.model("Invitation", InvitationSchema);
