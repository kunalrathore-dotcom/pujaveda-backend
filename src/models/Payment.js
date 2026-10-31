import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      default: "razorpay",
    },
    gatewayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    reconciliationStatus: {
      type: String,
      enum: ["not_required", "pending", "resolved"],
      default: "not_required",
    },
    reconciliationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model("Payment", paymentSchema);

