// /middlewares/cloudinaryUpload.ts
import { Request, Response, NextFunction } from "express";
import cloudinary from "../utils/cloudinary";

export const cloudinaryUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(); // no file, continue
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "my_app_uploads", // optional: folder in Cloudinary
    });

    // attach Cloudinary info to req.file
    (req.file as any).cloudinaryUrl = result.secure_url;
    (req.file as any).cloudinaryPublicId = result.public_id;

    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Cloudinary upload failed" });
  }
};
