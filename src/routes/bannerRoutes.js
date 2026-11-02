import express from "express";
import {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  restoreBanner,
  bulkDeleteBanners,
  bulkRestoreBanners,
} from "../controllers/bannerController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import {
  createBannerSchema,
  updateBannerSchema,
  bannerIdParamSchema,
} from "../validations/bannerValidation.js";

const router = express.Router();

router.get("/", getBanners);
router.get("/all", authenticate, requireAdmin, getAllBanners);

router.post("/", authenticate, requireAdmin, validate(createBannerSchema), createBanner);
router.post("/bulk-trash", authenticate, requireAdmin, bulkDeleteBanners);
router.post("/bulk-restore", authenticate, requireAdmin, bulkRestoreBanners);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(bannerIdParamSchema, "params"),
  validate(updateBannerSchema),
  updateBanner
);
router.put(
  "/:id/restore",
  authenticate,
  requireAdmin,
  validate(bannerIdParamSchema, "params"),
  restoreBanner
);
router.delete("/:id", authenticate, requireAdmin, validate(bannerIdParamSchema, "params"), deleteBanner);

export default router;

