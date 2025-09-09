import mongoose, { Schema , Document, Date} from "mongoose"; 

export interface IUser extends Document {
    firstName: string;  
    lastName: string; 
    userName: string;
    email: string;
    password: string;
    imgURL: string;
    cloud_imgURL: string;
    dateOfBirth: string;
    gender: string;
    city: string;
    occupation?: string;
    where_live?: string;
    where_from : string;
    hearingPlatform : string;
    referredBy : string;
    cities_frequent?: string;
    about?: string;
    approved: string;
    expoPushToken?: string;
    ques_ans: object;
    interests?: string[];
}

const UserSchema: Schema = new Schema(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    imgURL: { type: String, required: true },
    cloud_imgURL: { type: String, required: true },
    dateOfBirth: {type: String, require: true},
    gender: { type: String, required: true },
    city: { type: String, required: true },
    occupation: {type: String},
    where_live : {type: String},
    where_from : {type: String, required: true},
    hearingPlatform : {type: String, required: true},
    referredBy : {type: String, required: true},
    cities_frequent : {type: String},
    about : {type: String},
    approved: { type: String, default: 'pending' },
    expoPushToken: { type: String, default: '' },
    ques_ans: { type: Object, required: true },
    interests: { type: [String] },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
