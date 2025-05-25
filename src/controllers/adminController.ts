import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt';


const email = "admin@email.com";
const password = "admin";

export async function adminLogin(req: Request, res: Response): Promise<void> {
    try {
        if (req.body.email === email && req.body.password === password) {
            const token = generateToken({ id: `${email}:${password}` });
            res.status(200).json({ message: "Login successful", token });
        } else {
            res.status(400).json({ message: "Incorrect credentials" });
        }
    } catch (error) {
        console.error("Error in admin request:", error);
    }
}