// /middlewares/multerConfig.ts
import multer from "multer";

export const upload = multer({ storage: multer.memoryStorage() });

