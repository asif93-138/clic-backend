// src/middleware/spaces.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://ams3.digitaloceanspaces.com",
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
});

export async function doUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return next();

    const bucket = "twoclicclub";
    const fileName = "uploads/" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: req.file.buffer,
        ACL: "public-read",
        ContentType: req.file.mimetype,
      })
    );

    (req.file as any).cdnUrl = fileName;
    next();

  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({
      message: "Upload failed",
      error: err.message,
    });
  }
}