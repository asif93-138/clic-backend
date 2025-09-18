import { Request, Response } from 'express';
import DateFeedback from "../models/dateFeedback";

export default async function collectFeedback(req: Request, res: Response): Promise<void> {
    console.log(req.body);
    const result = await DateFeedback.create(req.body);
    res.json(result);
}