import mongoose from "mongoose";

const festivalCollectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Festival name is required"],
      trim: true,
      maxlength: [100, "Festival name cannot exceed 100 characters"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    bannerImageId: {
      type: String,
      default: "",
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
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
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const FestivalCollection = mongoose.model(
  "FestivalCollection",
  festivalCollectionSchema
);

