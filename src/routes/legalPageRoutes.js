import express from "express";
import {
  getPublicLegalPage,
  getAdminLegalPages,
  getAdminLegalPage,
  updateLegalPage,
} from "../controllers/legalPageController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public read-only endpoints (published pages only)
router.get("/:slug", getPublicLegalPage);

// Protected Admin endpoints
router.get("/admin/all", authenticate, requireAdmin, getAdminLegalPages);
router.get("/admin/:slug", authenticate, requireAdmin, getAdminLegalPage);
router.put("/admin/:slug", authenticate, requireAdmin, updateLegalPage);

export default router;
