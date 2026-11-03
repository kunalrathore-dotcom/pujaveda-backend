import mongoose from "mongoose";

const blogCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required."],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters."],
      maxlength: [40, "Category name cannot exceed 40 characters."],
    },
    slug: {
      type: String,
      required: [true, "Slug is required."],
      trim: true,
      lowercase: true,
      minlength: [2, "Slug must be at least 2 characters."],
      maxlength: [60, "Slug cannot exceed 60 characters."],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must consist of lowercase letters, numbers, and single hyphens.",
      ],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [150, "Description cannot exceed 150 characters."],
      default: "",
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
    isDemo: {
      type: Boolean,
      default: false,
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

// Compound index for querying active categories by slug
blogCategorySchema.index({ slug: 1, isDeleted: 1 });
blogCategorySchema.index({ isDeleted: 1, order: 1, createdAt: 1 });

export const BlogCategory = mongoose.model("BlogCategory", blogCategorySchema);
export default BlogCategory;

