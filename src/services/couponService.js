import { Coupon } from "../models/Coupon.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const extractSingleCouponCode = (body = {}) => {
  const collected = [];

  const pushValue = (value) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    collected.push(String(value).trim().toUpperCase());
  };

  pushValue(body.couponCode);
  pushValue(body.couponCodes);
  pushValue(body.coupons);

  const unique = [...new Set(collected.filter(Boolean))];
  if (unique.length > 1) {
    const error = new Error("Only one coupon can be applied per checkout. Coupon stacking is not allowed.");
    error.statusCode = 400;
    throw error;
  }

  return unique[0] || "";
};

const isProductEligibleForCoupon = (coupon, productId, categoryId) => {
  const hasProductRestrictions = coupon.applicableProducts?.length > 0;
  const hasCategoryRestrictions = coupon.applicableCategories?.length > 0;

  let isEligible = true;

  if (hasProductRestrictions) {
    isEligible = coupon.applicableProducts.some((id) => String(id) === String(productId));
  }

  if (hasCategoryRestrictions && isEligible) {
    isEligible = coupon.applicableCategories.some((id) => String(id) === String(categoryId));
  }

  return isEligible;
};

const computeDiscountAmount = (coupon, eligibleSubtotal) => {
  let discount = 0;
  if (coupon.discountType === "fixed") {
    discount = Math.min(Number(coupon.discountValue) || 0, eligibleSubtotal);
  } else if (coupon.discountType === "percentage") {
    discount = (eligibleSubtotal * (Number(coupon.discountValue) || 0)) / 100;
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, eligibleSubtotal);
  }

  return Math.max(0, roundMoney(discount));
};

export const allocateDiscountProportionally = (eligibleItems, totalDiscount) => {
  const items = (eligibleItems || []).map((item) => ({
    ...item,
    subtotal: roundMoney(item.subtotal),
    allocatedDiscount: 0,
  }));

  const eligibleSubtotal = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
  const discount = Math.min(roundMoney(totalDiscount), eligibleSubtotal);

  if (eligibleSubtotal <= 0 || discount <= 0 || items.length === 0) {
    return items;
  }

  const exactShares = items.map((item) => (item.subtotal / eligibleSubtotal) * discount);
  items.forEach((item, index) => {
    item.allocatedDiscount = Math.floor(exactShares[index] * 100) / 100;
  });

  let remainderPaise = Math.round(
    (discount - items.reduce((sum, item) => sum + item.allocatedDiscount, 0)) * 100
  );

  const ranked = items
    .map((item, index) => ({
      index,
      leftover: exactShares[index] - item.allocatedDiscount,
      productId: String(item.productId || ""),
    }))
    .sort((a, b) => b.leftover - a.leftover || a.productId.localeCompare(b.productId));

  let cursor = 0;
  while (remainderPaise > 0 && ranked.length > 0) {
    const target = items[ranked[cursor % ranked.length].index];
    target.allocatedDiscount = roundMoney(target.allocatedDiscount + 0.01);
    remainderPaise -= 1;
    cursor += 1;
  }

  return items;
};

const getCouponAvailabilityState = async (coupon, user) => {
  if (!coupon.isActive) {
    return { ok: false, reason: `Coupon '${coupon.code}' is currently inactive.` };
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { ok: false, reason: `Coupon '${coupon.code}' is not active yet.` };
  }

  if (coupon.expiryDate && now > coupon.expiryDate) {
    return { ok: false, reason: `Coupon '${coupon.code}' has expired.` };
  }

  if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
    return { ok: false, reason: `Coupon '${coupon.code}' has reached its maximum total usage limit.` };
  }

  const userId = user?._id || user?.id;
  if (userId && coupon.perUserLimit) {
    const userUsageCount = await CouponUsage.countDocuments({
      coupon: coupon._id,
      user: userId,
    });

    if (userUsageCount >= coupon.perUserLimit) {
      return {
        ok: false,
        reason: `You have already used coupon '${coupon.code}' the maximum allowed number of times (${coupon.perUserLimit}).`,
      };
    }
  }

  return { ok: true, reason: null };
};

export const couponService = {
  extractSingleCouponCode,
  allocateDiscountProportionally,

  async validateAndCalculate({ code, items, user }) {
    if (!code || typeof code !== "string" || !code.trim()) {
      return null;
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      const error = new Error(`Coupon '${normalizedCode}' does not exist.`);
      error.statusCode = 404;
      throw error;
    }

    const availability = await getCouponAvailabilityState(coupon, user);
    if (!availability.ok) {
      const error = new Error(availability.reason);
      error.statusCode = 400;
      throw error;
    }

    let eligibleSubtotal = 0;
    const eligibleItems = [];

    for (const item of items) {
      const prodId = String(
        item.product?._id ||
          item.productId ||
          item.product ||
          item._id ||
          item.id ||
          ""
      );

      let dbProduct = null;

      if (mongoose.Types.ObjectId.isValid(prodId)) {
        dbProduct = await Product.findById(prodId).select("name price category");
      } else if (prodId) {
        dbProduct = await Product.findOne({ slug: prodId }).select("name price category");
      }

      if (!dbProduct) {
        const error = new Error(`Product '${prodId}' was not found.`);
        error.statusCode = 400;
        throw error;
      }

      const qty = Number(item.quantity ?? 1);

      if (!Number.isInteger(qty) || qty < 1) {
        const error = new Error("Invalid product quantity.");
        error.statusCode = 400;
        throw error;
      }

      const productId = String(dbProduct._id);
      const categoryId = String(dbProduct.category);
      const itemSubtotal = roundMoney(Number(dbProduct.price) * qty);

      if (isProductEligibleForCoupon(coupon, productId, categoryId)) {
        eligibleSubtotal += itemSubtotal;
        eligibleItems.push({
          product: dbProduct._id,
          productId,
          name: dbProduct.name,
          quantity: qty,
          unitPrice: dbProduct.price,
          subtotal: itemSubtotal,
        });
      }
    }

    eligibleSubtotal = roundMoney(eligibleSubtotal);

    if (eligibleSubtotal <= 0 || eligibleItems.length === 0) {
      const error = new Error(
        `None of the items in your cart are eligible for coupon '${normalizedCode}'.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (coupon.minCartValue && eligibleSubtotal < coupon.minCartValue) {
      const error = new Error(
        `Minimum eligible cart subtotal of ₹${coupon.minCartValue.toLocaleString("en-IN")} is required for coupon '${normalizedCode}'. (Current: ₹${eligibleSubtotal.toLocaleString("en-IN")})`
      );
      error.statusCode = 400;
      throw error;
    }

    const discount = computeDiscountAmount(coupon, eligibleSubtotal);
    const allocations = allocateDiscountProportionally(eligibleItems, discount);

    return {
      couponId: coupon._id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount,
      minCartValue: coupon.minCartValue,
      discount,
      eligibleSubtotal,
      eligibleProducts: allocations,
      allocations,
    };
  },

  async getOffersForCart({ items, user }) {
    if (!items?.length) return [];

    const processedItems = [];

    for (const item of items) {
      const prodId = String(
        item.product?._id || item.productId || item.product || item._id || item.id || ""
      );

      let dbProduct = null;
      if (mongoose.Types.ObjectId.isValid(prodId)) {
        dbProduct = await Product.findById(prodId).select("name price category");
      } else if (prodId) {
        dbProduct = await Product.findOne({ slug: prodId }).select("name price category");
      }

      if (!dbProduct) continue;

      const qty = Math.max(1, Number(item.quantity || 1));
      processedItems.push({
        product: dbProduct._id,
        productId: String(dbProduct._id),
        name: dbProduct.name,
        quantity: qty,
        unitPrice: dbProduct.price,
        subtotal: roundMoney(dbProduct.price * qty),
        category: dbProduct.category,
      });
    }

    if (!processedItems.length) return [];

    const productIds = processedItems.map((item) => item.product);
    const categoryIds = processedItems.map((item) => item.category).filter(Boolean);

    const coupons = await Coupon.find({
      isActive: true,
      $or: [
        { applicableProducts: { $size: 0 }, applicableCategories: { $size: 0 } },
        { applicableProducts: { $in: productIds } },
        { applicableCategories: { $in: categoryIds } },
      ],
    }).sort({ createdAt: -1 });

    const offers = [];

    for (const coupon of coupons) {
      const availability = await getCouponAvailabilityState(coupon, user);
      if (!availability.ok) continue;

      const eligibleProducts = processedItems.filter((item) =>
        isProductEligibleForCoupon(coupon, item.productId, item.category)
      );

      if (!eligibleProducts.length) continue;

      const eligibleSubtotal = roundMoney(
        eligibleProducts.reduce((sum, item) => sum + item.subtotal, 0)
      );

      const meetsMinCart = !coupon.minCartValue || eligibleSubtotal >= coupon.minCartValue;
      const discount = meetsMinCart ? computeDiscountAmount(coupon, eligibleSubtotal) : 0;

      offers.push({
        couponId: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minCartValue: coupon.minCartValue || 0,
        expiryDate: coupon.expiryDate,
        eligibleProducts: eligibleProducts.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        eligibleSubtotal,
        discount,
        isApplicable: meetsMinCart,
        ineligibilityReason: meetsMinCart
          ? null
          : `Minimum eligible subtotal of ₹${Number(coupon.minCartValue).toLocaleString("en-IN")} required.`,
      });
    }

    return offers;
  },

  async getCouponsAssignedToProduct(productId) {
    if (!productId) return [];
    return Coupon.find({ applicableProducts: productId }).select(
      "code description discountType discountValue maxDiscount minCartValue isActive startDate expiryDate"
    );
  },

  async syncProductCouponAssignments(productId, couponIds = []) {
    if (!productId) return [];

    const uniqueIds = [...new Set((couponIds || []).map((id) => String(id)).filter(Boolean))];

    if (uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      const error = new Error("One or more selected coupon IDs are invalid.");
      error.statusCode = 400;
      throw error;
    }

    if (uniqueIds.length > 0) {
      const existingCount = await Coupon.countDocuments({ _id: { $in: uniqueIds } });
      if (existingCount !== uniqueIds.length) {
        const error = new Error("One or more selected coupons do not exist.");
        error.statusCode = 400;
        throw error;
      }
    }

    const currentlyAssigned = await Coupon.find({ applicableProducts: productId }).select("_id");
    const currentIds = currentlyAssigned.map((coupon) => String(coupon._id));
    const targetSet = new Set(uniqueIds);

    const toRemove = currentIds.filter((id) => !targetSet.has(id));
    if (toRemove.length) {
      await Coupon.updateMany(
        { _id: { $in: toRemove } },
        { $pull: { applicableProducts: productId } }
      );
    }

    if (uniqueIds.length) {
      await Coupon.updateMany(
        { _id: { $in: uniqueIds } },
        { $addToSet: { applicableProducts: productId } }
      );
    }

    return this.getCouponsAssignedToProduct(productId);
  },

  async recordRedemption({ couponCode, user, order, discountAmount, orderTotal }) {
    if (!couponCode) return null;

    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) return null;

    const existing = await CouponUsage.findOne({
      order: order._id,
      coupon: coupon._id,
    });
    if (existing) {
      return existing;
    }

    const updateQuery = {
      _id: coupon._id,
      $or: [{ totalUsageLimit: null }, { totalUsageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$totalUsageLimit"] } }],
    };

    const updated = await Coupon.findOneAndUpdate(updateQuery, {
      $inc: { usedCount: 1 },
    });

    if (!updated && coupon.totalUsageLimit) {
      throw new Error(`Coupon '${normalizedCode}' usage limit was exceeded during checkout.`);
    }

    const usage = await CouponUsage.create({
      coupon: coupon._id,
      couponCode: coupon.code,
      user: user._id || user,
      order: order._id,
      discountAmount,
      orderTotal,
      usedAt: new Date(),
    });

    return usage;
  },
};
