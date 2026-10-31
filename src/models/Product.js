import mongoose from "mongoose";

const specificationSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 100 },
  value: { type: String, trim: true, maxlength: 250 },
});

const faqSchema = new mongoose.Schema({
  question: { type: String, trim: true, maxlength: 200 },
  answer: { type: String, trim: true, maxlength: 1000 },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [120, "Product name cannot exceed 120 characters"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [50, "SKU cannot exceed 50 characters"],
      default: "",
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category reference is required"],
      index: true,
    },
    categoryId: {
      type: String,
      trim: true,
      index: true,
    },
    subcategoryId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    subcategoryName: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price / MRP cannot be negative"],
      default: function () {
        return this.price;
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock count is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    badge: {
      type: String,
      trim: true,
      maxlength: [30, "Badge cannot exceed 30 characters"],
      default: "",
    },
    // Multiple Images (minimum 5 enforced for published products, up to 8 initially)
    images: {
      type: [String],
      default: [],
    },
    imageIds: {
      type: [String],
      default: [],
    },
    primaryImage: {
      type: String,
      trim: true,
      default: "",
    },
    // Descriptions
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [250, "Short description cannot exceed 250 characters"],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      default: "",
    },
    // Devotional Product Specifications
    material: {
      type: String,
      trim: true,
      maxlength: [100, "Material cannot exceed 100 characters"],
      default: "",
    },
    weight: {
      type: String,
      trim: true,
      maxlength: [50, "Weight cannot exceed 50 characters"],
      default: "",
    },
    dimensions: {
      type: String,
      trim: true,
      maxlength: [50, "Dimensions cannot exceed 50 characters"],
      default: "",
    },
    packContents: {
      type: String,
      trim: true,
      maxlength: [250, "Pack contents cannot exceed 250 characters"],
      default: "",
    },
    origin: {
      type: String,
      trim: true,
      maxlength: [100, "Origin cannot exceed 100 characters"],
      default: "",
    },
    idealFor: {
      type: String,
      trim: true,
      maxlength: [250, "Ideal for cannot exceed 250 characters"],
      default: "",
    },
    careInstructions: {
      type: String,
      trim: true,
      maxlength: [500, "Care instructions cannot exceed 500 characters"],
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    // Publishing & Visibility Lifecycle
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Rating & Reviews (no fake reviews by default)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    specifications: [specificationSchema],
    faqs: [faqSchema],
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

productSchema.index({
  name: "text",
  description: "text",
  shortDescription: "text",
  subcategoryName: "text",
  tags: "text",
});

export const Product = mongoose.model("Product", productSchema);
