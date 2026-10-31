import express from "express";
import {
  getAuditLogs,
  getAuditStats,
  getUserTimeline,
  trackClientEvent,
} from "../controllers/auditController.js";
import { authenticate, optionalAuthenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public / User client tracking
router.post("/track", optionalAuthenticate, trackClientEvent);

// Admin User Activity Audit routes
router.get("/logs", authenticate, requireAdmin, getAuditLogs);
router.get("/stats", authenticate, requireAdmin, getAuditStats);
router.get("/user/:userId", authenticate, requireAdmin, getUserTimeline);

export default router;

