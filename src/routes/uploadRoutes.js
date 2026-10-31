import express from "express";
import {
  uploadImage,
  uploadMultipleImages,
  uploadMiddleware,
} from "../controllers/uploadController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uploadQuerySchema } from "../validations/uploadValidation.js";

const router = express.Router();

// Single image upload
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(uploadQuerySchema, "query"),
  uploadMiddleware.single("image"),
  uploadImage
);

// Batch / Multiple images upload (up to 10 images at once)
router.post(
  "/multiple",
  authenticate,
  requireAdmin,
  validate(uploadQuerySchema, "query"),
  uploadMiddleware.array("images", 10),
  uploadMultipleImages
);

export default router;
