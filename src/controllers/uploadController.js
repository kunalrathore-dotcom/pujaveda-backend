import multer from "multer";
import { storageService } from "../services/storageService.js";

// Multer in-memory storage for inspection & validation
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`
      ),
      false
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file limit
  },
  fileFilter,
});

export const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please select an image file to upload.",
    });
  }

  const folder = req.query.folder || "general";

  try {
    const result = await storageService.saveImage({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
    });

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      url: result.url,
      publicId: result.publicId,
      provider: result.provider,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process and store image.",
    });
  }
};

export const uploadMultipleImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please select at least one image file to upload.",
    });
  }

  const folder = req.query.folder || "products";
  const uploadedResults = [];
  const errors = [];

  for (const file of req.files) {
    try {
      const result = await storageService.saveImage({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        folder,
      });

      uploadedResults.push({
        url: result.url,
        publicId: result.publicId,
        originalname: file.originalname,
        provider: result.provider,
      });
    } catch (err) {
      errors.push({
        file: file.originalname,
        error: err.message,
      });
    }
  }

  if (uploadedResults.length === 0) {
    return res.status(400).json({
      success: false,
      message: "All image uploads failed.",
      errors,
    });
  }

  res.status(201).json({
    success: true,
    message: `Successfully uploaded ${uploadedResults.length} image(s).`,
    images: uploadedResults,
    urls: uploadedResults.map((r) => r.url),
    publicIds: uploadedResults.map((r) => r.publicId),
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
};
