import multer from "multer";
import { storageService } from "../services/storageService.js";
import { created, badRequest } from "../utils/apiResponse.js";

// Multer memoryStorage allows in-flight validation before any bytes hit disk
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
    files: 10, // Max 10 files per batch
  },
  fileFilter,
});

export const uploadImage = async (req, res) => {
  if (!req.file) {
    return badRequest(res, "Please select an image file to upload.");
  }

  const folder = req.query.folder || "general";

  try {
    const result = await storageService.saveImage({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
      req,
    });

    return created(res, "Image uploaded successfully.", {
      url: result.url,
      publicId: result.publicId,
      filename: result.filename,
      size: result.size,
      provider: "local",
    });
  } catch (error) {
    return badRequest(res, error.message || "Failed to process and store image.");
  }
};

export const uploadMultipleImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return badRequest(res, "Please select at least one image file to upload.");
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
        req,
      });

      uploadedResults.push({
        url: result.url,
        publicId: result.publicId,
        filename: result.filename,
        originalname: file.originalname,
        size: result.size,
        provider: "local",
      });
    } catch (err) {
      errors.push({
        file: file.originalname,
        error: err.message,
      });
    }
  }

  if (uploadedResults.length === 0) {
    return badRequest(res, "All image uploads failed.", errors);
  }

  return created(res, `Successfully uploaded ${uploadedResults.length} image(s).`, {
    images: uploadedResults,
    urls: uploadedResults.map((r) => r.url),
    publicIds: uploadedResults.map((r) => r.publicId),
    imageIds: uploadedResults.map((r) => r.publicId),
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
};
