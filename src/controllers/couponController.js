import { Coupon } from "../models/Coupon.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { couponService } from "../services/couponService.js";
import { auditService } from "../services/auditService.js";
import { ok, created, badRequest, notFound, serverError } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
const normalizeApplicableProducts = async (productIds) => {
  if (!Array.isArray(productIds)) {
    throw new Error("Applicable products must be an array.");
  }

  const ids = [...new Set(productIds.map((id) => String(id)))];

  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new Error("One or more selected product IDs are invalid.");
  }

  if (ids.length > 0) {
    const existingCount = await Product.countDocuments({
      _id: { $in: ids },
    });

    if (existingCount !== ids.length) {
      throw new Error("One or more selected products do not exist.");
    }
  }

  return ids;
};
export const getCoupons = async (req, res) => {
  try {
    const { search, discountType, isActive, isDeleted, page = 1, limit = 20 } = req.query;
    const query = {};

    if (isDeleted === "true") {
      query.isDeleted = true;
    } else if (isDeleted === "all") {
      // Admin request for all
    } else {
      query.isDeleted = { $ne: true };
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ code: reg }, { description: reg }];
    }

    if (discountType && discountType !== "all") {
      query.discountType = discountType;
    }

    if (isActive !== undefined && isActive !== "all") {
      query.isActive = isActive === "true";
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [coupons, total] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Coupon.countDocuments(query),
    ]);

    return ok(res, "Coupons fetched successfully.", {
      coupons,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    console.error("[CouponController] getCoupons error:", error);
    return serverError(res, error.message);
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description = "",
      discountType,
      discountValue,
      maxDiscount = null,
      minCartValue = 0,
      startDate = null,
      expiryDate = null,
      totalUsageLimit = null,
      perUserLimit = 1,
      isActive = true,
      applicableProducts = [],
      applicableCategories = [],
    } = req.body;

    if (!code || !code.trim()) {
      return badRequest(res, "Coupon code is required.");
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return badRequest(res, `Coupon code '${normalizedCode}' already exists.`);
    }

    let selectedProductIds;

    try {
      selectedProductIds = await normalizeApplicableProducts(applicableProducts);
    } catch (error) {
      return badRequest(res, error.message);
    }

    if (!["fixed", "percentage"].includes(discountType)) {
      return badRequest(res, "Discount type must be either 'fixed' or 'percentage'.");
    }

    const numValue = Number(discountValue);
    if (!Number.isFinite(numValue) || numValue <= 0) {
      return badRequest(res, "Discount value must be a positive number.");
    }

    if (discountType === "percentage" && numValue > 100) {
      return badRequest(res, "Percentage discount cannot exceed 100%.");
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      description: description.trim(),
      discountType,
      discountValue: numValue,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minCartValue: minCartValue ? Number(minCartValue) : 0,
      startDate: startDate ? new Date(startDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      isActive: Boolean(isActive),
      applicableCategories,
      applicableProducts: selectedProductIds,
    });

    await auditService.log({
      req,
      user: req.user,
      eventType: "COUPON_CREATED",
      category: "admin",
      description: `Admin created coupon ${coupon.code} (${coupon.discountType}: ${coupon.discountValue})`,
      entityType: "Coupon",
      entityId: coupon._id,
      metadata: { code: coupon.code, discountType, discountValue: numValue },
    });

    return created(res, "Coupon created successfully.", { coupon });
  } catch (error) {
    console.error("[CouponController] createCoupon error:", error);
    return serverError(res, error.message);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return notFound(res, "Coupon not found.");
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minCartValue,
      startDate,
      expiryDate,
      totalUsageLimit,
      perUserLimit,
      isActive,
      applicableProducts,
      applicableCategories,
    } = req.body;

    if (code && code.trim().toUpperCase() !== coupon.code) {
      const normalizedCode = code.trim().toUpperCase();
      const duplicate = await Coupon.findOne({ code: normalizedCode, _id: { $ne: id } });
      if (duplicate) {
        return badRequest(res, `Coupon code '${normalizedCode}' is already in use.`);
      }
      coupon.code = normalizedCode;
    }

    if (description !== undefined) coupon.description = description.trim();
    if (discountType !== undefined) {
      if (!["fixed", "percentage"].includes(discountType)) {
        return badRequest(res, "Discount type must be either 'fixed' or 'percentage'.");
      }
      coupon.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const numValue = Number(discountValue);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        return badRequest(res, "Discount value must be a positive number.");
      }
      if (coupon.discountType === "percentage" && numValue > 100) {
        return badRequest(res, "Percentage discount cannot exceed 100%.");
      }
      coupon.discountValue = numValue;
    }

    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (minCartValue !== undefined) coupon.minCartValue = minCartValue ? Number(minCartValue) : 0;
    if (startDate !== undefined) coupon.startDate = startDate ? new Date(startDate) : null;
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (totalUsageLimit !== undefined) coupon.totalUsageLimit = totalUsageLimit ? Number(totalUsageLimit) : null;
    if (perUserLimit !== undefined) coupon.perUserLimit = perUserLimit ? Number(perUserLimit) : 1;
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);
    if (applicableProducts !== undefined) {
      try {
        coupon.applicableProducts =
          await normalizeApplicableProducts(applicableProducts);
      } catch (error) {
        return badRequest(res, error.message);
      }
    } if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;

    await coupon.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "COUPON_UPDATED",
      category: "admin",
      description: `Admin updated coupon ${coupon.code}`,
      entityType: "Coupon",
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });

    return ok(res, "Coupon updated successfully.", { coupon });
  } catch (error) {
    console.error("[CouponController] updateCoupon error:", error);
    return serverError(res, error.message);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return notFound(res, "Coupon not found.");
    }

    // Global Soft Delete: Retain coupon record for historical audit & reporting
    coupon.isDeleted = true;
    coupon.deletedAt = new Date();
    coupon.deletedBy = req.user?._id || null;
    coupon.isActive = false;
    await coupon.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "COUPON_SOFT_DELETED",
      category: "admin",
      description: `Admin moved coupon ${coupon.code} to trash`,
      entityType: "Coupon",
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });

    return ok(res, "Coupon moved to trash successfully.");
  } catch (error) {
    console.error("[CouponController] deleteCoupon error:", error);
    return serverError(res, error.message);
  }
};

export const restoreCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return notFound(res, "Coupon not found.");
    }

    coupon.isDeleted = false;
    coupon.deletedAt = null;
    coupon.deletedBy = null;
    await coupon.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "COUPON_RESTORED",
      category: "admin",
      description: `Admin restored coupon ${coupon.code}`,
      entityType: "Coupon",
      entityId: coupon._id,
      metadata: { code: coupon.code },
    });

    return ok(res, "Coupon restored successfully.");
  } catch (error) {
    console.error("[CouponController] restoreCoupon error:", error);
    return serverError(res, error.message);
  }
};

export const bulkDeleteCoupons = async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = {};
    if (Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    } else {
      filter.isDeleted = { $ne: true };
    }
    const result = await Coupon.updateMany(filter, {
      $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?._id || null, isActive: false },
    });
    return ok(res, `${result.modifiedCount} coupon(s) moved to trash.`);
  } catch (err) {
    return serverError(res, err.message);
  }
};

export const bulkRestoreCoupons = async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = { isDeleted: true };
    if (Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    }
    const result = await Coupon.updateMany(filter, {
      $set: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
    return ok(res, `${result.modifiedCount} coupon(s) restored successfully.`);
  } catch (err) {
    return serverError(res, err.message);
  }
};

export const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return notFound(res, "Coupon not found.");
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "COUPON_STATUS_TOGGLED",
      category: "admin",
      description: `Admin toggled coupon ${coupon.code} status to ${coupon.isActive ? "active" : "inactive"}`,
      entityType: "Coupon",
      entityId: coupon._id,
    });

    return ok(res, `Coupon marked as ${coupon.isActive ? "active" : "inactive"}.`, {
      coupon,
    });
  } catch (error) {
    console.error("[CouponController] toggleCouponStatus error:", error);
    return serverError(res, error.message);
  }
};

export const getCouponUsages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return notFound(res, "Coupon not found.");
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [usages, total, totalDiscountAgg] = await Promise.all([
      CouponUsage.find({ coupon: id })
        .populate("user", "name email phone")
        .populate("order", "orderNumber totalAmount paymentStatus orderStatus createdAt")
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CouponUsage.countDocuments({ coupon: id }),
      CouponUsage.aggregate([
        { $match: { coupon: coupon._id } },
        { $group: { _id: null, totalDiscount: { $sum: "$discountAmount" } } },
      ]),
    ]);

    const totalDiscount = totalDiscountAgg[0]?.totalDiscount || 0;

    return ok(res, "Coupon usages retrieved successfully.", {
      coupon,
      usages,
      total,
      totalDiscount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    console.error("[CouponController] getCouponUsages error:", error);
    return serverError(res, error.message);
  }
};

/**
 * Public/User: Validate coupon against items in cart
 * (Disabled for Customer Storefront — coupons cannot be redeemed by customers)
 */
export const getCartCouponOffers = async (req, res) => {
  return ok(res, "Coupon redemption is disabled on storefront.", { offers: [] });
};

export const validateCoupon = async (req, res) => {
  return badRequest(res, "Coupon code redemption is currently disabled on the storefront.");
};

