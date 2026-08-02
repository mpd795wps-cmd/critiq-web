import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new Error("画像ファイルのみアップロードできます"));
  },
});

// POST /api/upload/image
router.post(
  "/upload/image",
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        error: "ファイルが見つかりません",
      });
      return;
    }

    try {
      const originalExtension =
        path.extname(req.file.originalname).toLowerCase() || ".jpg";

      const filename =
        `uploads/${Date.now()}-` +
        `${randomBytes(6).toString("hex")}` +
        originalExtension;

      const blob = await put(filename, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
        addRandomSuffix: false,
      });

      res.json({
        url: blob.url,
      });
    } catch (error) {
      console.error("Image upload failed:", error);

      const details =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              code:
                "code" in error &&
                typeof error.code === "string"
                  ? error.code
                  : undefined,
            }
          : {
              message: String(error),
            };

      res.status(500).json({
        error: "画像のアップロードに失敗しました",
        details,
      });
    }
  },
);

export default router;
