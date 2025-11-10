import { Request, Response } from 'express';
import DateFeedback from "../models/dateFeedback";

export default async function collectFeedback(req: Request, res: Response): Promise<void> {
    const result = await DateFeedback.create(req.body);
    res.json(result);
}