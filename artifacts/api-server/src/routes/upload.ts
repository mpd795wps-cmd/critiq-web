import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("画像ファイルのみアップロードできます"));
  },
});

// POST /upload/image  →  { url: "/api/uploads/<filename>" }
router.post("/upload/image", upload.single("image"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "ファイルが見つかりません" });
    return;
  }
  res.json({ url: `/api/uploads/${req.file.filename}` });
});

export default router;
