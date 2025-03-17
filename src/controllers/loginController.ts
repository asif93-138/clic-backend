import { Request, Response } from 'express';
import User from '../models/user.model';
import { generateToken } from '../utils/jwt';
import mongoose from "mongoose";
import { comparePassword } from '../utils/hashing';

interface ExtractObjectIdString {
    (objectId: mongoose.Types.ObjectId): string;
}

const extractObjectIdString: ExtractObjectIdString = (objectId) => {
    return objectId.toString();
};

export async function userLogin(req: Request, res: Response): Promise<void> {
    try {
        let ID;
        const isExists = await User.findOne({ email: req.body.email });
        if (isExists?._id instanceof mongoose.Types.ObjectId) {
            console.log(extractObjectIdString(isExists._id));
            ID = extractObjectIdString(isExists._id);
        }
        if (isExists) {
            const isPasswordValid = await comparePassword(req.body.password, isExists.password);
            if (isPasswordValid) {
                const token = generateToken({ id: ID });
                res.status(200).json({ message: "Login successful", token, isExists });
            } else {
                res.status(400).json({ message: "Incorrect password" });
            }
        } else {
            res.status(400).json({ message: "User does not exist" });
        }
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}