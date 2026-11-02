import express from "express";
import multer from "multer";
import { getProfile, updateProfile, uploadAvatar } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../validations/authValidation.js";

const router = express.Router();

// Multer memoryStorage configuration for profile avatar uploads (5MB max, JPEG/PNG/WebP)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WebP images are supported.`
        ),
        false
      );
    }
  },
});

// All user routes require valid customer authentication
router.use(authenticate);

// Profile retrieval and updates
router.get("/profile", getProfile);
router.put("/profile", validate(updateProfileSchema), updateProfile);

// Avatar upload
router.post(
  "/profile/avatar",
  avatarUpload.single("image"),
  uploadAvatar
);

export default router;

