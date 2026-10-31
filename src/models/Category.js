import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
      minlength: [2, "Subcategory name must be at least 2 characters"],
      maxlength: [60, "Subcategory name cannot exceed 60 characters"],
    },
    slug: {
      type: String,
      required: [true, "Subcategory slug is required"],
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
    createdAt: {
      type: Date,
      default: function () {
        return this.isNew ? new Date() : undefined;
      },
    },
  },
  {
    timestamps: true,
  }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [60, "Category name cannot exceed 60 characters"],
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    imageId: {
      type: String,
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
    subcategories: [subcategorySchema],
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model("Category", categorySchema);
