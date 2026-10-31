import { DivineCard } from "../models/DivineCard.js";
import { storageService } from "../services/storageService.js";

export const getDivineCards = async (req, res) => {
  const { placement, category } = req.query;
  const filter = { isActive: true, isDeleted: { $ne: true } };

  if (placement) {
    filter.$or = [{ placement: "all" }, { placement }];
  }
  if (category) {
    filter.$or = filter.$or || [];
    filter.$or.push({ categorySlug: category }, { categorySlug: "" }, { categorySlug: { $exists: false } });
  }

  const cards = await DivineCard.find(filter).sort({ order: 1, createdAt: 1 });
  res.json({
    success: true,
    cards,
  });
};

export const getAllDivineCards = async (req, res) => {
  const { isDeleted } = req.query;
  const filter = {};
  if (isDeleted === "true") {
    filter.isDeleted = true;
  } else if (isDeleted === "all") {
    // Admin request for all
  } else {
    filter.isDeleted = { $ne: true };
  }

  const cards = await DivineCard.find(filter).sort({ order: 1, createdAt: 1 });
  res.json({
    success: true,
    cards,
  });
};

export const createDivineCard = async (req, res) => {
  const {
    title,
    pretitle,
    description,
    imageUrl,
    imageId,
    ctaText,
    link,
    placement = "all",
    categorySlug = "",
    isActive = true,
    order = 0,
  } = req.body;

  const card = await DivineCard.create({
    title: title ? title.trim() : "",
    pretitle: pretitle ? pretitle.trim() : "",
    description: description ? description.trim() : "",
    imageUrl,
    imageId: imageId || "",
    ctaText: ctaText ? ctaText.trim() : "Explore Essentials",
    link: link || "/category/puja-items",
    placement: ["all", "homepage", "category"].includes(placement) ? placement : "all",
    categorySlug: categorySlug ? categorySlug.trim() : "",
    isActive: Boolean(isActive),
    order: Number(order || 0),
  });

  res.status(201).json({
    success: true,
    message: "Divine card created successfully.",
    card,
  });
};

export const updateDivineCard = async (req, res) => {
  const { id } = req.params;
  const card = await DivineCard.findById(id);

  if (!card) {
    return res.status(404).json({
      success: false,
      message: "Divine card not found.",
    });
  }

  const {
    title,
    pretitle,
    description,
    imageUrl,
    imageId,
    ctaText,
    link,
    placement,
    categorySlug,
    isActive,
    order,
  } = req.body;

  if (title !== undefined) card.title = title.trim();
  if (pretitle !== undefined) card.pretitle = pretitle.trim();
  if (description !== undefined) card.description = description.trim();
  if (ctaText !== undefined) card.ctaText = ctaText.trim();
  if (link !== undefined) card.link = link.trim();
  if (placement !== undefined && ["all", "homepage", "category"].includes(placement)) {
    card.placement = placement;
  }
  if (categorySlug !== undefined) card.categorySlug = categorySlug.trim();
  if (isActive !== undefined) card.isActive = Boolean(isActive);
  if (order !== undefined) card.order = Number(order);

  if (imageUrl !== undefined) card.imageUrl = imageUrl;
  if (imageId !== undefined) {
    if (card.imageId && card.imageId !== imageId) {
      storageService.deleteImage(card.imageId).catch(() => {});
    }
    card.imageId = imageId;
  }

  await card.save();

  res.json({
    success: true,
    message: "Divine card updated successfully.",
    card,
  });
};

export const deleteDivineCard = async (req, res) => {
  const { id } = req.params;
  const card = await DivineCard.findById(id);

  if (!card) {
    return res.status(404).json({
      success: false,
      message: "Divine card not found.",
    });
  }

  // Global Soft Delete: Keep card record, flag as isDeleted: true
  card.isDeleted = true;
  card.deletedAt = new Date();
  card.deletedBy = req.user?._id || null;
  card.isActive = false;
  await card.save();

  res.json({
    success: true,
    message: "Divine card moved to trash successfully.",
  });
};

export const restoreDivineCard = async (req, res) => {
  const { id } = req.params;
  const card = await DivineCard.findById(id);

  if (!card) {
    return res.status(404).json({
      success: false,
      message: "Divine card not found.",
    });
  }

  card.isDeleted = false;
  card.deletedAt = null;
  card.deletedBy = null;
  await card.save();

  res.json({
    success: true,
    message: "Divine card restored successfully.",
  });
};

