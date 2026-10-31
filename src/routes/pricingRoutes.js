import express from "express";
import {
  getAllCharges,
  getActiveCharges,
  createCharge,
  updateCharge,
  toggleChargeStatus,
  deleteCharge,
  restoreCharge,
} from "../controllers/pricingController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public route to get active taxes & charges
router.get("/active", getActiveCharges);

// Admin Tax & Fee Management routes
router.get("/", authenticate, requireAdmin, getAllCharges);
router.post("/", authenticate, requireAdmin, createCharge);
router.put("/:id", authenticate, requireAdmin, updateCharge);
router.patch("/:id/status", authenticate, requireAdmin, toggleChargeStatus);
router.put("/:id/restore", authenticate, requireAdmin, restoreCharge);
router.delete("/:id", authenticate, requireAdmin, deleteCharge);

export default router;

