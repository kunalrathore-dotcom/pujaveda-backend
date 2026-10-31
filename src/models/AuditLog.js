import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    userRole: {
      type: String,
      default: "user",
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["auth", "product", "cart", "wishlist", "checkout", "order", "payment", "shopping", "account", "admin", "system"],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      default: "",
    },
    entityId: {
      type: String,
      default: "",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);

