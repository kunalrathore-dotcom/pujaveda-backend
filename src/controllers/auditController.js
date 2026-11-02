import mongoose from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { auditService } from "../services/auditService.js";
import { ok, badRequest, notFound, serverError } from "../utils/apiResponse.js";

/**
 * Get paginated audit logs with search and filters (Admin only)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "all",
      eventType = "all",
      userId,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [
        { userName: reg },
        { userEmail: reg },
        { description: reg },
        { entityId: reg },
        { ipAddress: reg },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (eventType && eventType !== "all") {
      query.eventType = eventType;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [rawLogs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(query),
    ]);

    // Extract distinct valid user ObjectIds
    const userIds = [
      ...new Set(
        rawLogs
          .map((l) => (l.user ? String(l.user) : null))
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      ),
    ];

    let userMap = new Map();
    if (userIds.length > 0) {
      const existingUsers = await User.find({ _id: { $in: userIds } })
        .select("_id name email role isActive")
        .lean();
      userMap = new Map(existingUsers.map((u) => [String(u._id), u]));
    }

    const logs = rawLogs.map((log) => {
      const rawUserId = log.user ? String(log.user) : null;
      const userRef = rawUserId ? userMap.get(rawUserId) || null : null;
      const isUserAvailable = Boolean(userRef);

      return {
        ...log,
        userId: rawUserId,
        userRef,
        isUserAvailable,
      };
    });

    return ok(res, "Audit logs retrieved successfully.", {
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    console.error("[AuditController] getAuditLogs error:", error);
    return serverError(res, error.message);
  }
};

/**
 * Get high-level summary statistics for Admin Audit Dashboard
 */
export const getAuditStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayDateQuery = {
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    const [
      totalRegisteredUsers,
      registrationsToday,
      todayLoginsAgg,
      loginEventsToday,
      activityEventsToday,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", ...todayDateQuery }),
      AuditLog.aggregate([
        {
          $match: {
            eventType: { $in: ["USER_LOGGED_IN", "ADMIN_LOGGED_IN"] },
            ...todayDateQuery,
            user: { $ne: null },
          },
        },
        { $group: { _id: "$user" } },
        { $count: "uniqueUsers" },
      ]),
      AuditLog.countDocuments({
        eventType: { $in: ["USER_LOGGED_IN", "ADMIN_LOGGED_IN"] },
        ...todayDateQuery,
      }),
      AuditLog.countDocuments(todayDateQuery),
    ]);

    const usersLoggedInToday = todayLoginsAgg[0]?.uniqueUsers || 0;

    return ok(res, "Audit summary statistics retrieved successfully.", {
      stats: {
        totalRegisteredUsers,
        usersLoggedInToday,
        registrationsToday,
        loginEventsToday,
        activityEventsToday,
      },
    });
  } catch (error) {
    console.error("[AuditController] getAuditStats error:", error);
    return serverError(res, error.message);
  }
};

/**
 * Get chronological activity timeline for an individual user
 */
export const getUserTimeline = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return notFound(res, "User not found.");
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [timeline, total] = await Promise.all([
      AuditLog.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments({ user: userId }),
    ]);

    return ok(res, "User activity timeline retrieved successfully.", {
      user,
      timeline,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    console.error("[AuditController] getUserTimeline error:", error);
    return serverError(res, error.message);
  }
};

/**
 * Public/User client tracking endpoint
 * Strictly validates allowed event types from the client
 */
export const trackClientEvent = async (req, res) => {
  try {
    const { eventType, category, description, entityType, entityId, metadata } = req.body;

    const ALLOWED_CLIENT_EVENTS = new Set([
      "PRODUCT_VIEWED",
      "PRODUCT_SEARCHED",
      "CART_VIEWED",
      "CHECKOUT_INITIATED",
      "COUPON_APPLIED",
      "COUPON_REMOVED",
      "USER_LOGGED_OUT",
    ]);

    if (!ALLOWED_CLIENT_EVENTS.has(eventType)) {
      return badRequest(res, `Event type '${eventType}' is not permitted via client tracking.`);
    }

    await auditService.log({
      req,
      user: req.user,
      eventType,
      category: category || "product",
      description: description || `Client event: ${eventType}`,
      entityType: entityType || "",
      entityId: entityId || "",
      metadata: metadata || {},
    });

    return ok(res, "Event recorded successfully.");
  } catch (error) {
    return badRequest(res, error.message);
  }
};
