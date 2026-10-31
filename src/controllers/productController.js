import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Coupon } from "../models/Coupon.js";
import { storageService } from "../services/storageService.js";
import { couponService } from "../services/couponService.js";

const attachAssignedCoupons = async (products) => {
  const list = Array.isArray(products) ? products : [products];
  if (!list.length) return products;

  const ids = list.map((product) => product._id);
  const coupons = await Coupon.find({ applicableProducts: { $in: ids } }).select(
    "code description discountType discountValue maxDiscount minCartValue isActive startDate expiryDate applicableProducts"
  );

  const mapped = list.map((product) => {
    const assignedCoupons = coupons.filter((coupon) =>
      (coupon.applicableProducts || []).some((id) => String(id) === String(product._id))
    );
    const json = product.toObject ? product.toObject() : product;
    return { ...json, assignedCoupons };
  });

  return Array.isArray(products) ? mapped : mapped[0];
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getProducts = async (req, res) => {
  const {
    search,
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    sortBy,
    isPublished,
    isFeatured,
    isDeleted,
    page,
    limit,
  } = req.query;

  const filter = {};

  // Soft delete filter: exclude deleted records by default unless explicitly querying trash
  if (isDeleted === "true") {
    filter.isDeleted = true;
  } else if (isDeleted === "all") {
    // Admin request for all products regardless of deletion status
  } else {
    filter.isDeleted = { $ne: true };
  }

  // Storefront visibility: default to showing only published products unless explicitly requesting "all"
  if (isPublished === "all") {
    // Admin request for all products
  } else if (isPublished === "false") {
    filter.isPublished = false;
  } else {
    // Default storefront: published products only
    filter.isPublished = { $ne: false };
  }

  if (isFeatured === "true") {
    filter.isFeatured = true;
  }

  if (categoryId && categoryId !== "all") {
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.$or = [{ category: categoryId }, { categoryId }];
    } else {
      filter.$or = [
        { categoryId: categoryId.toLowerCase().trim() },
        { "category.slug": categoryId.toLowerCase().trim() }
      ];
    }
  }

  if (subcategoryId && subcategoryId !== "all") {
    if (mongoose.Types.ObjectId.isValid(subcategoryId)) {
      filter.$or = [
        { subcategory: subcategoryId },
        { subcategoryId: subcategoryId }
      ];
    } else {
      filter.$or = [
        { subcategoryId: subcategoryId },
        { subcategoryName: { $regex: `^${subcategoryId}$`, $options: "i" } }
      ];
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { shortDescription: { $regex: q, $options: "i" } },
      { subcategoryName: { $regex: q, $options: "i" } },
      { categoryId: { $regex: q, $options: "i" } },
      { material: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  let sort = { createdAt: -1 };
  if (sortBy === "price-low") sort = { price: 1 };
  if (sortBy === "price-high") sort = { price: -1 };
  if (sortBy === "rating") sort = { rating: -1 };
  if (sortBy === "featured") sort = { isFeatured: -1, createdAt: -1 };
  if (sortBy === "newest") sort = { createdAt: -1 };

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  const productsWithCoupons = await attachAssignedCoupons(products);

  res.json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    products: productsWithCoupons,
  });
};

export const getProductById = async (req, res) => {
  const { id } = req.params;

  let product = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id).populate("category", "name slug");
  }

  if (!product) {
    product = await Product.findOne({
      $or: [
        { slug: id.toLowerCase().trim() },
        { sku: id.toUpperCase().trim() },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    }).populate("category", "name slug");
  }

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  const productWithCoupons = await attachAssignedCoupons(product);

  res.json({
    success: true,
    product: productWithCoupons,
  });
};

export const createProduct = async (req, res) => {
  const {
    name,
    sku,
    categoryId,
    subcategoryId,
    subcategoryName,
    price,
    originalPrice,
    stock,
    badge,
    images,
    imageIds,
    primaryImage,
    shortDescription,
    description,
    material,
    weight,
    dimensions,
    packContents,
    origin,
    idealFor,
    careInstructions,
    tags,
    isPublished = true,
    isFeatured = false,
    specifications,
    faqs,
  } = req.body;

  // Resolve category by ObjectId or slug
  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(categoryId)) {
    categoryDoc = await Category.findById(categoryId);
  }
  if (!categoryDoc) {
    categoryDoc = await Category.findOne({ slug: categoryId.toLowerCase().trim() });
  }

  if (!categoryDoc) {
    return res.status(400).json({
      success: false,
      message: `Referenced category '${categoryId}' does not exist.`,
    });
  }

  // Validate subcategory if specified
  let subName = subcategoryName || "";
  if (subcategoryId && categoryDoc.subcategories?.length) {
    const matchedSub = categoryDoc.subcategories.find(
      (s) => s.slug === subcategoryId || s._id.toString() === subcategoryId
    );
    if (matchedSub) {
      subName = matchedSub.name;
    }
  }

  // Multiple Image Validation for published products (minimum 5 required)
  const imageList = Array.isArray(images) ? images : [];
  if (isPublished && imageList.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Every published product must have at least 5 images.",
    });
  }

  // Generate unique slug
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 2;
  while (await Product.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const resolvedPrimaryImage = primaryImage || imageList[0] || "";

  const product = await Product.create({
    name: name.trim(),
    slug,
    sku: sku ? sku.trim().toUpperCase() : "",
    category: categoryDoc._id,
    categoryId: categoryDoc.slug,
    subcategoryId: subcategoryId || "",
    subcategoryName: subName,
    price: Number(price),
    originalPrice: Number(originalPrice || price),
    stock: Number(stock || 0),
    badge: badge || "",
    images: imageList,
    imageIds: Array.isArray(imageIds) ? imageIds : [],
    primaryImage: resolvedPrimaryImage,
    shortDescription: shortDescription || "",
    description: description || "",
    material: material || "",
    weight: weight || "",
    dimensions: dimensions || "",
    packContents: packContents || "",
    origin: origin || "",
    idealFor: idealFor || "",
    careInstructions: careInstructions || "",
    tags: Array.isArray(tags) ? tags : [],
    isPublished: Boolean(isPublished),
    isFeatured: Boolean(isFeatured),
    specifications: Array.isArray(specifications)
      ? specifications
      : Object.entries(specifications || {}).map(([label, value]) => ({ label, value })),
    faqs: faqs || [],
  });

  if (Array.isArray(req.body.couponIds)) {
    await couponService.syncProductCouponAssignments(product._id, req.body.couponIds);
  }

  const productWithCoupons = await attachAssignedCoupons(product);

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    product: productWithCoupons,
  });
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  const data = req.body;

  if (data.categoryId) {
    let categoryDoc = null;
    if (mongoose.Types.ObjectId.isValid(data.categoryId)) {
      categoryDoc = await Category.findById(data.categoryId);
    }
    if (!categoryDoc) {
      categoryDoc = await Category.findOne({ slug: data.categoryId.toLowerCase().trim() });
    }
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: `Category '${data.categoryId}' not found.`,
      });
    }
    product.category = categoryDoc._id;
    product.categoryId = categoryDoc.slug;
  }

  if (data.name && data.name.trim() !== product.name) {
    product.name = data.name.trim();
    let baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 2;
    while (await Product.exists({ slug, _id: { $ne: product._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    product.slug = slug;
  }

  // Handle image replacement/deletion cleanup to prevent orphaned files
  if (Array.isArray(data.imageIds) && Array.isArray(product.imageIds)) {
    const retainedIds = new Set(data.imageIds);
    const removedIds = product.imageIds.filter((oldId) => !retainedIds.has(oldId));
    if (removedIds.length > 0) {
      // Async clean up of orphaned files
      Promise.allSettled(removedIds.map((rId) => storageService.deleteImage(rId))).catch((err) =>
        console.warn("[ProductUpdate] Cleanup orphaned images warning:", err.message)
      );
    }
    product.imageIds = data.imageIds;
  }

  if (data.images !== undefined) {
    const isPub = data.isPublished !== undefined ? data.isPublished : product.isPublished;
    if (isPub && data.images.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Every published product must have at least 5 images.",
      });
    }
    product.images = data.images;
  }

  if (data.primaryImage !== undefined) {
    product.primaryImage = data.primaryImage;
  } else if (!product.primaryImage && product.images?.length > 0) {
    product.primaryImage = product.images[0];
  }

  if (data.sku !== undefined) product.sku = data.sku.trim().toUpperCase();
  if (data.subcategoryId !== undefined) product.subcategoryId = data.subcategoryId;
  if (data.subcategoryName !== undefined) product.subcategoryName = data.subcategoryName;
  if (data.price !== undefined) product.price = Number(data.price);
  if (data.originalPrice !== undefined) product.originalPrice = Number(data.originalPrice);
  if (data.stock !== undefined) product.stock = Number(data.stock);
  if (data.badge !== undefined) product.badge = data.badge;
  if (data.shortDescription !== undefined) product.shortDescription = data.shortDescription;
  if (data.description !== undefined) product.description = data.description;
  if (data.material !== undefined) product.material = data.material;
  if (data.weight !== undefined) product.weight = data.weight;
  if (data.dimensions !== undefined) product.dimensions = data.dimensions;
  if (data.packContents !== undefined) product.packContents = data.packContents;
  if (data.origin !== undefined) product.origin = data.origin;
  if (data.idealFor !== undefined) product.idealFor = data.idealFor;
  if (data.careInstructions !== undefined) product.careInstructions = data.careInstructions;
  if (data.tags !== undefined) product.tags = data.tags;
  if (data.isPublished !== undefined) product.isPublished = Boolean(data.isPublished);
  if (data.isFeatured !== undefined) product.isFeatured = Boolean(data.isFeatured);

  if (data.specifications !== undefined) {
    product.specifications = Array.isArray(data.specifications)
      ? data.specifications
      : Object.entries(data.specifications || {}).map(([label, value]) => ({ label, value }));
  }
  if (data.faqs !== undefined) product.faqs = data.faqs;

  await product.save();

  if (Array.isArray(data.couponIds)) {
    await couponService.syncProductCouponAssignments(product._id, data.couponIds);
  }

  const productWithCoupons = await attachAssignedCoupons(product);

  res.json({
    success: true,
    message: "Product updated successfully.",
    product: productWithCoupons,
  });
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  // Global Soft Delete: Mark record as deleted, preserve images and relations for restore capability
  product.isDeleted = true;
  product.deletedAt = new Date();
  product.deletedBy = req.user?._id || null;
  product.isPublished = false;
  await product.save();

  res.json({
    success: true,
    message: "Product moved to trash successfully.",
  });
};

export const restoreProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  product.isDeleted = false;
  product.deletedAt = null;
  product.deletedBy = null;
  await product.save();

  res.json({
    success: true,
    message: "Product restored successfully.",
  });
};
