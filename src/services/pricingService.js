import { PricingCharge } from "../models/PricingCharge.js";
import { Product } from "../models/Product.js";
import { couponService } from "./couponService.js";
import mongoose from "mongoose";

/**
 * Ensure default standard charges (GST and Platform Fee) exist in database
 */
export const ensureDefaultCharges = async () => {
  await PricingCharge.updateOne(
    { key: "gst" },
    {
      $setOnInsert: {
        key: "gst",
        name: "GST",
        type: "percentage",
        value: 18,
        calculationBasis: "discounted_subtotal",
        description: "Goods and Services Tax on eligible discounted product subtotal",
        isActive: true,
      },
    },
    { upsert: true }
  );

  await PricingCharge.updateOne(
    { key: "platform_fee" },
    {
      $setOnInsert: {
        key: "platform_fee",
        name: "Platform Fee",
        type: "percentage",
        value: 2,
        calculationBasis: "discounted_subtotal",
        description: "Platform convenience and handling fee",
        isActive: true,
      },
    },
    { upsert: true }
  );
};

export const pricingService = {
  /**
   * Fetch all active pricing charges from database
   */
  async getActiveCharges() {
    await ensureDefaultCharges();
    return PricingCharge.find({ isActive: true }).sort({ createdAt: 1 });
  },

  /**
   * Centrally calculate complete order pricing breakdown
   *
   * Calculation Order:
   * 1. Product subtotal from real database products
   * 2. Coupon discount calculated on eligible subtotal
   * 3. discountedSubtotal = subtotal - couponDiscount
   * 4. GST calculated on configured basis
   * 5. Platform fee calculated on configured basis
   * 6. Add all applicable charges
   * 7. Final payable amount (rounded to 2 decimal places)
   */
  async calculateOrderPricing({ rawItems, couponCode, couponCodes, coupons, user, includeOffers = true }) {
    if (!rawItems || !rawItems.length) {
      const error = new Error("Cart must contain at least one product.");
      error.statusCode = 400;
      throw error;
    }

    const selectedCouponCode = couponService.extractSingleCouponCode({
      couponCode,
      couponCodes,
      coupons,
    });

    // 1. Calculate eligible product subtotal using actual product prices and quantities from DB
    const processedItems = [];
    let subtotal = 0;

    for (const item of rawItems) {
      const prodId = item.productId || item._id || item.id || item.product;
      let product = null;

      if (mongoose.Types.ObjectId.isValid(prodId)) {
        product = await Product.findById(prodId);
      } else {
        product = await Product.findOne({ slug: prodId });
      }

      if (!product) {
        const error = new Error(`Product '${prodId}' not found in database.`);
        error.statusCode = 404;
        throw error;
      }

      const qty = Math.max(1, Number(item.quantity || 1));
      if (product.stock < qty) {
        const error = new Error(
          `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${qty}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const itemTotal = Math.round(product.price * qty * 100) / 100;
      subtotal += itemTotal;

      processedItems.push({
        product: product._id,
        productId: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.images?.[0] || "",
        category: product.category,
        allocatedDiscount: 0,
        couponEligible: false,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // 2. Calculate coupon discount against eligible subtotal only
    let couponResult = null;
    let couponDiscount = 0;

    if (selectedCouponCode) {
      couponResult = await couponService.validateAndCalculate({
        code: selectedCouponCode,
        items: processedItems,
        user,
      });
      if (couponResult) {
        couponDiscount = couponResult.discount;
        const allocationMap = new Map(
          (couponResult.allocations || []).map((row) => [String(row.productId), row.allocatedDiscount])
        );
        processedItems.forEach((item) => {
          const allocated = allocationMap.get(String(item.productId)) || 0;
          item.allocatedDiscount = allocated;
          item.couponEligible = allocationMap.has(String(item.productId));
        });
      }
    }

    // 3. Subtract coupon discount from eligible subtotal
    const discountedSubtotal = Math.max(0, Math.round((subtotal - couponDiscount) * 100) / 100);

    // 4 & 5. Fetch active charges and calculate each charge
    const activeCharges = await this.getActiveCharges();
    const chargesBreakdown = [];
    let taxAmount = 0;
    let platformFee = 0;

    for (const charge of activeCharges) {
      let basisAmount = discountedSubtotal;
      if (charge.calculationBasis === "subtotal") {
        basisAmount = subtotal;
      }

      let chargeAmount = 0;
      if (charge.type === "percentage") {
        chargeAmount = (basisAmount * charge.value) / 100;
      } else if (charge.type === "fixed") {
        chargeAmount = charge.value;
      }

      // Round each charge to 2 decimals
      chargeAmount = Math.round(chargeAmount * 100) / 100;

      if (charge.key === "gst" || charge.name.toLowerCase().includes("gst") || charge.name.toLowerCase().includes("tax")) {
        taxAmount += chargeAmount;
      } else if (charge.key === "platform_fee" || charge.name.toLowerCase().includes("platform")) {
        platformFee += chargeAmount;
      }

      chargesBreakdown.push({
        key: charge.key,
        name: charge.type === "percentage" ? `${charge.name} (${charge.value}%)` : charge.name,
        type: charge.type,
        rate: charge.value,
        amount: chargeAmount,
      });
    }

    taxAmount = Math.round(taxAmount * 100) / 100;
    platformFee = Math.round(platformFee * 100) / 100;

    // 6. Calculate total charges and final payable amount
    const totalCharges = chargesBreakdown.reduce((sum, c) => sum + c.amount, 0);
    const shippingFee = 0; // Free shipping
    const totalAmount = Math.max(0, Math.round((discountedSubtotal + totalCharges + shippingFee) * 100) / 100);

    const availableOffers = includeOffers
      ? await couponService.getOffersForCart({ items: processedItems, user })
      : [];

    return {
      items: processedItems,
      subtotal,
      coupon: couponResult
        ? {
            code: couponResult.code,
            discountType: couponResult.discountType,
            discountValue: couponResult.discountValue,
            maxDiscount: couponResult.maxDiscount || null,
            discount: couponDiscount,
            eligibleSubtotal: couponResult.eligibleSubtotal,
            eligibleProducts: couponResult.eligibleProducts || [],
            allocations: couponResult.allocations || [],
          }
        : null,
      discountedSubtotal,
      taxAmount,
      platformFee,
      chargesBreakdown,
      shippingFee,
      totalAmount,
      razorpayAmountInPaise: Math.round(totalAmount * 100),
      availableOffers,
    };
  },
};

