import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema(
  {
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

couponUsageSchema.index({ coupon: 1, user: 1 });
couponUsageSchema.index({ order: 1, coupon: 1 }, { unique: true });

export const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

