import mongoose from "mongoose";

const pricingChargeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    calculationBasis: {
      type: String,
      enum: ["discounted_subtotal", "subtotal", "fixed"],
      default: "discounted_subtotal",
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PricingCharge = mongoose.model("PricingCharge", pricingChargeSchema);

