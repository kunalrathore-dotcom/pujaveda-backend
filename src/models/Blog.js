import mongoose from "mongoose";
import { BLOG_CATEGORIES } from "../constants/blogCategories.js";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Article title is required."],
      trim: true,
      minlength: [2, "Article title must be at least 2 characters."],
      maxlength: [80, "Article title cannot exceed 80 characters."],
    },
    slug: {
      type: String,
      required: [true, "Slug is required."],
      trim: true,
      lowercase: true,
      minlength: [2, "Slug must be at least 2 characters."],
      maxlength: [100, "Slug cannot exceed 100 characters."],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must consist of lowercase letters, numbers, and single hyphens without special characters.",
      ],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required."],
      trim: true,
      enum: {
        values: BLOG_CATEGORIES,
        message: "Please select a valid category from the approved Pujaveda Journal categories.",
      },
      index: true,
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required."],
      trim: true,
      minlength: [5, "Short description must be at least 5 characters."],
      maxlength: [180, "Short description cannot exceed 180 characters."],
    },
    coverImage: {
      type: String,
      required: [true, "Cover image is required."],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Article content is required."],
      trim: true,
      minlength: [10, "Article content must be at least 10 characters."],
      maxlength: [20000, "Article content cannot exceed 20,000 characters."],
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [70, "SEO title cannot exceed 70 characters."],
      default: "",
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, "SEO description cannot exceed 160 characters."],
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published"],
        message: "Status must be either 'draft' or 'published'.",
      },
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    author: {
      type: String,
      trim: true,
      default: "Pujaveda Editorial",
    },
    authorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance querying
blogSchema.index({ isDeleted: 1, status: 1, publishedAt: -1, createdAt: -1 });
blogSchema.index({ isDeleted: 1, category: 1, status: 1, publishedAt: -1 });
blogSchema.index({ slug: 1, isDeleted: 1 });

export const Blog = mongoose.model("Blog", blogSchema);
export default Blog;

