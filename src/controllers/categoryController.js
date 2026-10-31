import mongoose from "mongoose";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { storageService } from "../services/storageService.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getCategories = async (req, res) => {
  const { all, isDeleted } = req.query;
  const filter = {};

  if (isDeleted === "true") {
    filter.isDeleted = true;
  } else if (isDeleted === "all") {
    // Admin request for all categories
  } else {
    filter.isDeleted = { $ne: true };
  }

  if (all !== "true" && isDeleted !== "true") {
    filter.isActive = { $ne: false };
  }

  const categories = await Category.find(filter).sort({ order: 1, createdAt: 1 });
  res.json({
    success: true,
    categories,
  });
};

export const getCategoryById = async (req, res) => {
  const { id } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const products = await Product.find({
    $or: [{ category: category._id }, { categoryId: category.slug }],
    isPublished: { $ne: false },
  });

  res.json({
    success: true,
    category,
    products,
  });
};

export const createCategory = async (req, res) => {
  const { name, image, imageId, isActive = true, order = 0 } = req.body;
  const cleanName = name.trim().replace(/\s+/g, " ");

  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: "Category with this name already exists.",
    });
  }

  let baseSlug = slugify(cleanName);
  let slug = baseSlug;
  let counter = 2;
  while (await Category.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const category = await Category.create({
    name: cleanName,
    slug,
    image: image || "",
    imageId: imageId || "",
    isActive: Boolean(isActive),
    order: Number(order || 0),
    subcategories: [],
  });

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    category,
  });
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const { name, image, imageId, isActive, order } = req.body;

  if (name && name.trim()) {
    const cleanName = name.trim().replace(/\s+/g, " ");
    const existingCategory = await Category.findOne({
      _id: { $ne: category._id },
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists.",
      });
    }

    if (cleanName !== category.name) {
      category.name = cleanName;
      let baseSlug = slugify(cleanName);
      let slug = baseSlug;
      let counter = 2;
      while (await Category.exists({ slug, _id: { $ne: category._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      category.slug = slug;
    }
  }

  if (image !== undefined) category.image = image;
  if (imageId !== undefined) {
    if (category.imageId && category.imageId !== imageId) {
      storageService.deleteImage(category.imageId).catch(() => {});
    }
    category.imageId = imageId;
  }
  if (isActive !== undefined) category.isActive = Boolean(isActive);
  if (order !== undefined) category.order = Number(order);

  await category.save();

  res.json({
    success: true,
    message: "Category updated successfully.",
    category,
  });
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  // Business Rule: Check if published non-deleted products belong to this category
  const productCount = await Product.countDocuments({
    $or: [{ category: category._id }, { categoryId: category.slug }],
    isDeleted: { $ne: true },
  });

  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot move category to trash: ${productCount} active product(s) are currently assigned to it. Please reassign or delete these products first.`,
    });
  }

  // Global Soft Delete: Retain category and images, set isDeleted true
  category.isDeleted = true;
  category.deletedAt = new Date();
  category.deletedBy = req.user?._id || null;
  category.isActive = false;
  await category.save();

  res.json({
    success: true,
    message: "Category moved to trash successfully.",
  });
};

export const restoreCategory = async (req, res) => {
  const { id } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  category.isDeleted = false;
  category.deletedAt = null;
  category.deletedBy = null;
  await category.save();

  res.json({
    success: true,
    message: "Category restored successfully.",
  });
};

export const createSubcategory = async (req, res) => {
  const { id } = req.params;
  const { name, isActive = true, order = 0 } = req.body;
  const cleanName = name.trim().replace(/\s+/g, " ");

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const slug = slugify(cleanName);
  if (category.subcategories.some((s) => s.slug === slug || s.name.toLowerCase() === cleanName.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: "Subcategory with this name already exists in this category.",
    });
  }

  const now = new Date();
  category.subcategories.push({
    name: cleanName,
    slug,
    isActive: Boolean(isActive),
    order: Number(order || 0),
    createdAt: now,
  });
  await category.save();

  res.status(201).json({
    success: true,
    message: "Subcategory added successfully.",
    category,
    subcategory: category.subcategories[category.subcategories.length - 1],
  });
};

export const updateSubcategory = async (req, res) => {
  const { id, subcategoryId } = req.params;
  const { name, isActive, order } = req.body;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const sub = category.subcategories.find(
    (s) => s._id.toString() === subcategoryId || s.slug === subcategoryId
  );

  if (!sub) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found.",
    });
  }

  if (name && name.trim()) {
    const cleanName = name.trim().replace(/\s+/g, " ");
    const slug = slugify(cleanName);
    const isDuplicate = category.subcategories.some(
      (s) =>
        s._id.toString() !== sub._id.toString() &&
        (s.slug === slug || s.name.toLowerCase() === cleanName.toLowerCase())
    );
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this name already exists in this category.",
      });
    }

    sub.name = cleanName;
    sub.slug = slug;
  }

  if (isActive !== undefined) sub.isActive = Boolean(isActive);
  if (order !== undefined) sub.order = Number(order);

  await category.save();

  res.json({
    success: true,
    message: "Subcategory updated successfully.",
    subcategory: sub,
  });
};

export const deleteSubcategory = async (req, res) => {
  const { id, subcategoryId } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const sub = category.subcategories.find(
    (s) => s._id.toString() === subcategoryId || s.slug === subcategoryId
  );

  if (!sub) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found.",
    });
  }

  // Check if active non-deleted products exist for this subcategory
  const productCount = await Product.countDocuments({
    $or: [
      { categoryId: category.slug, subcategoryId: sub.slug },
      { categoryId: category.slug, subcategoryId: sub._id.toString() },
    ],
    isDeleted: { $ne: true },
  });

  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot move subcategory to trash: ${productCount} active product(s) are assigned to it.`,
    });
  }

  // Soft delete subcategory
  sub.isDeleted = true;
  sub.deletedAt = new Date();
  sub.deletedBy = req.user?._id || null;
  sub.isActive = false;
  await category.save();

  res.json({
    success: true,
    message: "Subcategory moved to trash successfully.",
  });
};

export const restoreSubcategory = async (req, res) => {
  const { id, subcategoryId } = req.params;

  let category = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id);
  }
  if (!category) {
    category = await Category.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }

  const sub = category.subcategories.find(
    (s) => s._id.toString() === subcategoryId || s.slug === subcategoryId
  );

  if (!sub) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found.",
    });
  }

  sub.isDeleted = false;
  sub.deletedAt = null;
  sub.deletedBy = null;
  await category.save();

  res.json({
    success: true,
    message: "Subcategory restored successfully.",
    subcategory: sub,
  });
};
