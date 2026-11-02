import express from "express";
import {
  getAuditLogs,
  getAuditStats,
  getUserTimeline,
  trackClientEvent,
} from "../controllers/auditController.js";
import { authenticate, optionalAuthenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { trackEventSchema, auditQuerySchema } from "../validations/auditValidation.js";

const router = express.Router();

// Public / User client tracking
router.post("/track", optionalAuthenticate, validate(trackEventSchema), trackClientEvent);

// Admin User Activity Audit routes
router.get("/logs", authenticate, requireAdmin, validate(auditQuerySchema, "query"), getAuditLogs);
router.get("/stats", authenticate, requireAdmin, getAuditStats);
router.get("/user/:userId", authenticate, requireAdmin, getUserTimeline);

export default router;

