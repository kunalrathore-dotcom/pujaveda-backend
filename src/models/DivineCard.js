import mongoose from "mongoose";

const divineCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Card title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    pretitle: {
      type: String,
      trim: true,
      maxlength: [50, "Pretitle cannot exceed 50 characters"],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    imageId: {
      type: String,
      default: "",
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [30, "CTA label cannot exceed 30 characters"],
      default: "Explore Essentials",
    },
    link: {
      type: String,
      trim: true,
      default: "/category/puja-items",
    },
    placement: {
      type: String,
      enum: ["all", "homepage", "category"],
      default: "all",
      index: true,
    },
    categorySlug: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
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

export const DivineCard = mongoose.model("DivineCard", divineCardSchema);

