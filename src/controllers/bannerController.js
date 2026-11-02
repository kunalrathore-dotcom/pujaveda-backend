import { Banner } from "../models/Banner.js";
import { storageService } from "../services/storageService.js";
import { ok, created, notFound } from "../utils/apiResponse.js";

export const getBanners = async (req, res) => {
  const banners = await Banner.find({ active: true, isDeleted: { $ne: true } }).sort({ order: 1, createdAt: -1 });
  return ok(res, "Banners retrieved successfully", { banners });
};

export const getAllBanners = async (req, res) => {
  const { isDeleted } = req.query;
  const filter = {};
  if (isDeleted === "true") {
    filter.isDeleted = true;
  } else if (isDeleted === "all") {
    // Admin request for all
  } else {
    filter.isDeleted = { $ne: true };
  }

  const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
  return ok(res, "All banners retrieved successfully", { banners });
};

export const createBanner = async (req, res) => {
  const {
    title,
    subtitle,
    imageUrl,
    imageId,
    mobileImageUrl,
    mobileImageId,
    ctaText,
    link,
    active,
    order,
  } = req.body;

  const banner = await Banner.create({
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : "",
    imageUrl,
    imageId: imageId || "",
    mobileImageUrl: mobileImageUrl || "",
    mobileImageId: mobileImageId || "",
    ctaText: ctaText ? ctaText.trim() : "Explore Collection",
    link: link || "/category/puja-items",
    active: active !== undefined ? Boolean(active) : true,
    order: Number(order || 0),
  });

  return created(res, "Banner created successfully.", { banner });
};

export const updateBanner = async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findById(id);
  if (!banner) {
    return notFound(res, "Banner not found.");
  }

  const {
    title,
    subtitle,
    imageUrl,
    imageId,
    mobileImageUrl,
    mobileImageId,
    ctaText,
    link,
    active,
    order,
  } = req.body;

  if (title !== undefined) banner.title = title.trim();
  if (subtitle !== undefined) banner.subtitle = subtitle.trim();
  if (ctaText !== undefined) banner.ctaText = ctaText.trim();
  if (link !== undefined) banner.link = link.trim();
  if (active !== undefined) banner.active = Boolean(active);
  if (order !== undefined) banner.order = Number(order);

  if (imageUrl !== undefined) banner.imageUrl = imageUrl;
  if (imageId !== undefined) {
    if (banner.imageId && banner.imageId !== imageId) {
      storageService.deleteImage(banner.imageId).catch(() => {});
    }
    banner.imageId = imageId;
  }

  if (mobileImageUrl !== undefined) banner.mobileImageUrl = mobileImageUrl;
  if (mobileImageId !== undefined) {
    if (banner.mobileImageId && banner.mobileImageId !== mobileImageId) {
      storageService.deleteImage(banner.mobileImageId).catch(() => {});
    }
    banner.mobileImageId = mobileImageId;
  }

  await banner.save();

  return ok(res, "Banner updated successfully.", { banner });
};

export const deleteBanner = async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findById(id);
  if (!banner) {
    return notFound(res, "Banner not found.");
  }

  // Global Soft Delete: Retain image and record, mark isDeleted: true
  banner.isDeleted = true;
  banner.deletedAt = new Date();
  banner.deletedBy = req.user?._id || null;
  banner.active = false;
  await banner.save();

  return ok(res, "Banner moved to trash successfully.");
};

export const restoreBanner = async (req, res) => {
  const { id } = req.params;

  const banner = await Banner.findById(id);
  if (!banner) {
    return notFound(res, "Banner not found.");
  }

  banner.isDeleted = false;
  banner.deletedAt = null;
  banner.deletedBy = null;
  await banner.save();

  return ok(res, "Banner restored successfully.");
};
