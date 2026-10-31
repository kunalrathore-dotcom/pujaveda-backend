import { AuditLog } from "../models/AuditLog.js";

// Sensitive fields that must NEVER be persisted in audit metadata
const SENSITIVE_KEYS = new Set([
  "password",
  "confirmPassword",
  "currentPassword",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "otp",
  "secret",
  "webhookSecret",
  "razorpay_signature",
  "signature",
  "cardNumber",
  "cvv",
]);

const sanitizeMetadata = (obj, depth = 0) => {
  if (!obj || typeof obj !== "object" || depth > 4) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadata(item, depth + 1));
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes("password") || key.toLowerCase().includes("secret")) {
      clean[key] = "[REDACTED]";
    } else if (val && typeof val === "object") {
      clean[key] = sanitizeMetadata(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

export const auditService = {
  /**
   * Log an activity event asynchronously without blocking or failing the main flow
   */
  async log({
    req,
    user,
    eventType,
    category,
    description,
    entityType = "",
    entityId = "",
    metadata = {},
  }) {
    try {
      const activeUser = user || req?.user;
      let ipAddress = "";
      let userAgent = "";

      if (req) {
        ipAddress =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        userAgent = req.headers["user-agent"] || "";
      }

      const logEntry = {
        user: activeUser?._id || null,
        userName: activeUser?.name || "",
        userEmail: activeUser?.email || metadata?.email || "",
        userRole: activeUser?.role || "user",
        eventType,
        category,
        description,
        entityType,
        entityId: String(entityId || ""),
        metadata: sanitizeMetadata(metadata),
        ipAddress,
        userAgent,
      };

      await AuditLog.create(logEntry);
    } catch (err) {
      console.warn("[AuditService] Failed to record audit log:", err.message);
    }
  },
};

