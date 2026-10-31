import { FestivalCollection } from "../models/FestivalCollection.js";
import { Product } from "../models/Product.js";
import { storageService } from "../services/storageService.js";

export const getFestivalCollections = async (req, res) => {
  const collections = await FestivalCollection.find({ isActive: true, isDeleted: { $ne: true } })
    .populate({
      path: "products",
      match: { isPublished: { $ne: false }, isDeleted: { $ne: true } },
      select: "name price originalPrice images primaryImage stock rating reviews",
    })
    .sort({ order: 1, createdAt: -1 });

  res.json({
    success: true,
    collections,
  });
};

export const getAllFestivalCollections = async (req, res) => {
  const { isDeleted } = req.query;
  const filter = {};
  if (isDeleted === "true") {
    filter.isDeleted = true;
  } else if (isDeleted === "all") {
    // Admin request for all
  } else {
    filter.isDeleted = { $ne: true };
  }

  const collections = await FestivalCollection.find(filter)
    .populate({
      path: "products",
      select: "name price stock isPublished images primaryImage",
    })
    .sort({ order: 1, createdAt: -1 });

  res.json({
    success: true,
    collections,
  });
};

export const createFestivalCollection = async (req, res) => {
  const { name, title, description, bannerImage, bannerImageId, products, isActive = true, order = 0 } = req.body;

  const collection = await FestivalCollection.create({
    name: name.trim(),
    title: title.trim(),
    description: description ? description.trim() : "",
    bannerImage: bannerImage || "",
    bannerImageId: bannerImageId || "",
    products: Array.isArray(products) ? products : [],
    isActive: Boolean(isActive),
    order: Number(order || 0),
  });

  res.status(201).json({
    success: true,
    message: "Festival collection created successfully.",
    collection,
  });
};

export const updateFestivalCollection = async (req, res) => {
  const { id } = req.params;
  const collection = await FestivalCollection.findById(id);

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: "Festival collection not found.",
    });
  }

  const { name, title, description, bannerImage, bannerImageId, products, isActive, order } = req.body;

  if (name !== undefined) collection.name = name.trim();
  if (title !== undefined) collection.title = title.trim();
  if (description !== undefined) collection.description = description.trim();
  if (products !== undefined) collection.products = products;
  if (isActive !== undefined) collection.isActive = Boolean(isActive);
  if (order !== undefined) collection.order = Number(order);

  if (bannerImage !== undefined) collection.bannerImage = bannerImage;
  if (bannerImageId !== undefined) {
    if (collection.bannerImageId && collection.bannerImageId !== bannerImageId) {
      storageService.deleteImage(collection.bannerImageId).catch(() => {});
    }
    collection.bannerImageId = bannerImageId;
  }

  await collection.save();

  res.json({
    success: true,
    message: "Festival collection updated successfully.",
    collection,
  });
};

export const deleteFestivalCollection = async (req, res) => {
  const { id } = req.params;
  const collection = await FestivalCollection.findById(id);

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: "Festival collection not found.",
    });
  }

  // Global Soft Delete: Retain collection, flag isDeleted: true
  collection.isDeleted = true;
  collection.deletedAt = new Date();
  collection.deletedBy = req.user?._id || null;
  collection.isActive = false;
  await collection.save();

  res.json({
    success: true,
    message: "Festival collection moved to trash successfully.",
  });
};

export const restoreFestivalCollection = async (req, res) => {
  const { id } = req.params;
  const collection = await FestivalCollection.findById(id);

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: "Festival collection not found.",
    });
  }

  collection.isDeleted = false;
  collection.deletedAt = null;
  collection.deletedBy = null;
  await collection.save();

  res.json({
    success: true,
    message: "Festival collection restored successfully.",
  });
};

