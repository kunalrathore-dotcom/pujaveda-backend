import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      minlength: [2, "Banner title must be at least 2 characters"],
      maxlength: [120, "Banner title cannot exceed 120 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [300, "Banner description cannot exceed 300 characters"],
      default: "",
    },
    imageUrl: {
      type: String,
      required: [true, "Desktop banner image URL is required"],
    },
    imageId: {
      type: String,
      default: "",
    },
    mobileImageUrl: {
      type: String,
      default: "",
    },
    mobileImageId: {
      type: String,
      default: "",
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [30, "CTA label cannot exceed 30 characters"],
      default: "Explore Collection",
    },
    link: {
      type: String,
      trim: true,
      maxlength: [250, "Link cannot exceed 250 characters"],
      default: "/category/puja-items",
    },
    active: {
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

export const Banner = mongoose.model("Banner", bannerSchema);
