import mongoose from "mongoose";
import { Order } from "../models/Order.js";

/**
 * Escapes regex special characters to prevent ReDoS or query injection.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses a date string into reliable calendar year, month, day components.
 */
function parseDateParts(dateStr, defaultDate = new Date()) {
  if (!dateStr || typeof dateStr !== "string") {
    const y = defaultDate.getFullYear();
    const m = defaultDate.getMonth() + 1;
    const d = defaultDate.getDate();
    return { y, m, d };
  }

  const parts = dateStr.split("-").map(Number);
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { y: parts[0], m: parts[1], d: parts[2] };
  } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { y: parts[0], m: parts[1], d: 1 };
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return { y: parts[0], m: 1, d: 1 };
  }

  const y = defaultDate.getFullYear();
  const m = defaultDate.getMonth() + 1;
  const d = defaultDate.getDate();
  return { y, m, d };
}

/**
 * Determines whether an order is officially confirmed collected.
 * Rules:
 * 1. Cancelled orders are never collected.
 * 2. COD orders are collected ONLY after orderStatus is 'Delivered' AND paymentStatus is 'paid'.
 * 3. Online orders (Razorpay, demo_online) are collected ONLY if paymentStatus is 'paid'.
 */
export function isOrderPaidAndCollected(order) {
  if (!order || order.orderStatus === "Cancelled") {
    return false;
  }
  if (order.paymentMethod === "cod") {
    return order.orderStatus === "Delivered" && order.paymentStatus === "paid";
  }
  return order.paymentStatus === "paid";
}

/**
 * Resolves the authoritative payment collection timestamp of an order.
 * - Online orders: verifiedAt || paidAt || updatedAt || createdAt
 * - COD orders: updatedAt (timestamp when marked Delivered & paid) || createdAt
 */
export function getOrderCollectionDate(order) {
  if (!order) return null;
  if (!isOrderPaidAndCollected(order)) return null;

  if (order.paymentDetails?.verifiedAt) {
    return new Date(order.paymentDetails.verifiedAt);
  }
  if (order.paymentDetails?.paidAt) {
    return new Date(order.paymentDetails.paidAt);
  }
  if (order.paymentMethod === "cod") {
    return order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt);
  }
  return order.updatedAt ? new Date(order.updatedAt) : new Date(order.createdAt);
}

/**
 * Calculates eligible fee earnings on an order.
 * Strictly includes:
 * - platformFee
 * - eligible service/convenience charges from chargesBreakdown
 * Strictly EXCLUDES:
 * - taxes (GST/tax)
 * - customer shipping
 * - duplicate charges
 */
export function calculateOrderEligibleFee(order) {
  const platformFee = Number(order.platformFee || 0);
  const charges = Array.isArray(order.chargesBreakdown) ? order.chargesBreakdown : [];
  const additionalEligibleFees = charges.reduce((acc, c) => {
    const key = (c.key || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    // Exclude taxes, platform_fee duplicate, and shipping
    if (
      key === "gst" ||
      key === "tax" ||
      key === "platform_fee" ||
      key === "shipping" ||
      name.includes("gst") ||
      name.includes("tax") ||
      name.includes("shipping") ||
      name.includes("platform fee")
    ) {
      return acc;
    }
    return acc + (Number(c.amount) || 0);
  }, 0);

  return Number((platformFee + additionalEligibleFees).toFixed(2));
}

/**
 * Generates 7 daily slots starting from reference date (Day 0 + next 6 days).
 */
function generateDaySlots(dateStr) {
  const { y, m, d } = parseDateParts(dateStr);
  const slots = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(Date.UTC(y, m - 1, d + i, 0, 0, 0, 0));
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");

    const start = new Date(`${year}-${month}-${day}T00:00:00.000+05:30`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);

    const dateObj = new Date(start.getTime() + 1000 * 60 * 60 * 12);
    const label = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
    const fullLabel = dateObj.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    slots.push({
      key: `${year}-${month}-${day}`,
      label,
      fullLabel,
      isReference: i === 0,
      start,
      end,
      totalCollected: 0,
      adminFeeEarnings: 0,
      productRevenue: 0,
      platformFee: 0,
      orderCount: 0,
      paidOrderCount: 0,
      pendingAmount: 0,
    });
  }

  return slots;
}

/**
 * Generates 12 monthly slots starting from reference month (Month 0 + next 11 months).
 */
function generateMonthSlots(dateStr) {
  const { y, m } = parseDateParts(dateStr);
  const slots = [];

  for (let i = 0; i < 12; i++) {
    const current = new Date(Date.UTC(y, m - 1 + i, 1, 0, 0, 0, 0));
    const year = current.getUTCFullYear();
    const monthNum = current.getUTCMonth() + 1;
    const monthStr = String(monthNum).padStart(2, "0");

    const start = new Date(`${year}-${monthStr}-01T00:00:00.000+05:30`);
    const nextMonth = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
    const lastDayOfMonth = new Date(nextMonth.getTime() - 86400000).getUTCDate();
    const lastDayStr = String(lastDayOfMonth).padStart(2, "0");
    const end = new Date(`${year}-${monthStr}-${lastDayStr}T23:59:59.999+05:30`);

    const dateObj = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 10);
    const label = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "2-digit" });
    const fullLabel = dateObj.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "long",
      year: "numeric",
    });

    slots.push({
      key: `${year}-${monthStr}`,
      label,
      fullLabel,
      isReference: i === 0,
      start,
      end,
      totalCollected: 0,
      adminFeeEarnings: 0,
      productRevenue: 0,
      platformFee: 0,
      orderCount: 0,
      paidOrderCount: 0,
      pendingAmount: 0,
    });
  }

  return slots;
}

/**
 * Generates 5 yearly slots starting from reference year (Year 0 + next 4 years).
 */
function generateYearSlots(dateStr) {
  const { y } = parseDateParts(dateStr);
  const slots = [];

  for (let i = 0; i < 5; i++) {
    const year = y + i;
    const start = new Date(`${year}-01-01T00:00:00.000+05:30`);
    const end = new Date(`${year}-12-31T23:59:59.999+05:30`);

    slots.push({
      key: String(year),
      label: String(year),
      fullLabel: `Year ${year}`,
      isReference: i === 0,
      start,
      end,
      totalCollected: 0,
      adminFeeEarnings: 0,
      productRevenue: 0,
      platformFee: 0,
      orderCount: 0,
      paidOrderCount: 0,
      pendingAmount: 0,
    });
  }

  return slots;
}

/**
 * GET /api/admin/earnings/summary
 * Summary metrics: Product Value, Customer Paid, Admin Fee Earnings, Taxes, Shipping, Discounts.
 */
export const getEarningsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchFilter = {};
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) {
        matchFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchFilter.createdAt.$lte = end;
      }
    }

    // Strict collection eligibility condition in MongoDB
    const isCollectedCond = {
      $and: [
        { $ne: ["$orderStatus", "Cancelled"] },
        {
          $or: [
            {
              $and: [
                { $eq: ["$paymentMethod", "cod"] },
                { $eq: ["$orderStatus", "Delivered"] },
                { $eq: ["$paymentStatus", "paid"] },
              ],
            },
            {
              $and: [
                { $ne: ["$paymentMethod", "cod"] },
                { $eq: ["$paymentStatus", "paid"] },
              ],
            },
          ],
        },
      ],
    };

    const aggregation = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          productValue: { $sum: { $ifNull: ["$subtotal", 0] } },
          customerPaid: {
            $sum: {
              $cond: [isCollectedCond, "$totalAmount", 0],
            },
          },
          platformFeeCollected: {
            $sum: {
              $cond: [isCollectedCond, { $ifNull: ["$platformFee", 0] }, 0],
            },
          },
          taxesCollected: {
            $sum: {
              $cond: [isCollectedCond, { $ifNull: ["$taxAmount", 0] }, 0],
            },
          },
          shippingCollected: {
            $sum: {
              $cond: [isCollectedCond, { $ifNull: ["$shippingFee", 0] }, 0],
            },
          },
          discountGiven: { $sum: { $ifNull: ["$coupon.discount", 0] } },
          pendingAmount: {
            $sum: {
              $cond: [
                { $not: isCollectedCond },
                {
                  $cond: [{ $ne: ["$orderStatus", "Cancelled"] }, "$totalAmount", 0],
                },
                0,
              ],
            },
          },
          collectedOrdersCount: {
            $sum: {
              $cond: [isCollectedCond, 1, 0],
            },
          },
          pendingOrdersCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: isCollectedCond },
                    { $ne: ["$orderStatus", "Cancelled"] },
                    { $ne: ["$paymentStatus", "failed"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          failedOrdersCount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0],
            },
          },
          cancelledOrdersCount: {
            $sum: {
              $cond: [{ $eq: ["$orderStatus", "Cancelled"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const result = aggregation[0] || {
      totalOrders: 0,
      productValue: 0,
      customerPaid: 0,
      platformFeeCollected: 0,
      taxesCollected: 0,
      shippingCollected: 0,
      discountGiven: 0,
      pendingAmount: 0,
      collectedOrdersCount: 0,
      pendingOrdersCount: 0,
      failedOrdersCount: 0,
      cancelledOrdersCount: 0,
    };

    // Fetch all collected orders to calculate total revenue, today's revenue, and admin fee earnings
    const collectedOrders = await Order.find({
      ...matchFilter,
      orderStatus: { $ne: "Cancelled" },
      $or: [
        { paymentMethod: "cod", orderStatus: "Delivered", paymentStatus: "paid" },
        { paymentMethod: { $ne: "cod" }, paymentStatus: "paid" },
      ],
    })
      .select("totalAmount paymentMethod orderStatus paymentStatus paymentDetails updatedAt createdAt platformFee chargesBreakdown")
      .lean();

    // Determine Today's bounds in IST (Asia/Kolkata)
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayIST = istFormatter.format(now); // "YYYY-MM-DD"
    const todayStart = new Date(`${todayIST}T00:00:00.000+05:30`).getTime();
    const todayEnd = new Date(`${todayIST}T23:59:59.999+05:30`).getTime();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let totalAdminFeeEarnings = 0;

    for (const ord of collectedOrders) {
      const amount = Number(ord.totalAmount || 0);
      totalRevenue += amount;
      totalAdminFeeEarnings += calculateOrderEligibleFee(ord);

      const collDate = getOrderCollectionDate(ord);
      if (collDate) {
        const collTime = collDate.getTime();
        if (collTime >= todayStart && collTime <= todayEnd) {
          todayRevenue += amount;
        }
      }
    }

    res.json({
      success: true,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        todayRevenue: Number(todayRevenue.toFixed(2)),
        productValue: Number(result.productValue.toFixed(2)),
        customerPaid: Number(totalRevenue.toFixed(2)),
        adminFeeEarnings: Number(totalAdminFeeEarnings.toFixed(2)),
        taxesCollected: Number(result.taxesCollected.toFixed(2)),
        platformFee: Number(result.platformFeeCollected.toFixed(2)),
        shippingCollected: Number(result.shippingCollected.toFixed(2)),
        discountGiven: Number(result.discountGiven.toFixed(2)),
        pendingAmount: Number(result.pendingAmount.toFixed(2)),
        totalOrders: result.totalOrders,
        collectedOrdersCount: collectedOrders.length,
        pendingOrdersCount: result.pendingOrdersCount,
        failedOrdersCount: result.failedOrdersCount,
        cancelledOrdersCount: result.cancelledOrdersCount,
      },
    });
  } catch (err) {
    console.error("Earnings summary error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to calculate earnings summary.",
    });
  }
};

/**
 * GET /api/admin/earnings/orders
 * Paginated list of latest orders with clear financial breakdown columns:
 * Product Value, Customer Paid, Admin Fee Earnings, Taxes, Fees, Shipping, Total.
 */
export const getEarningsOrders = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentStatus,
      orderStatus,
    } = req.query;

    const filter = {};

    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }

    if (orderStatus && orderStatus !== "all") {
      filter.orderStatus = orderStatus;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const escaped = escapeRegex(q);
      const orClauses = [
        { orderNumber: { $regex: escaped, $options: "i" } },
        { "customerDetails.name": { $regex: escaped, $options: "i" } },
        { "customerDetails.email": { $regex: escaped, $options: "i" } },
        { "customerDetails.phone": { $regex: escaped, $options: "i" } },
        { "paymentDetails.razorpayPaymentId": { $regex: escaped, $options: "i" } },
        { "paymentDetails.razorpayOrderId": { $regex: escaped, $options: "i" } },
      ];

      if (mongoose.Types.ObjectId.isValid(q)) {
        orClauses.push({ user: new mongoose.Types.ObjectId(q) });
        orClauses.push({ _id: new mongoose.Types.ObjectId(q) });
      }

      filter.$or = orClauses;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [rawOrders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const orders = rawOrders.map((order) => {
      const isCollected = isOrderPaidAndCollected(order);
      const customerPaid = isCollected ? Number(order.totalAmount || 0) : 0;
      const adminFeeEarnings = isCollected ? calculateOrderEligibleFee(order) : 0;

      // Extract non-tax, non-platform additional charges
      const charges = Array.isArray(order.chargesBreakdown) ? order.chargesBreakdown : [];
      const additionalEligibleFees = charges.reduce((acc, c) => {
        const key = (c.key || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        if (
          key === "gst" ||
          key === "tax" ||
          key === "platform_fee" ||
          key === "shipping" ||
          name.includes("gst") ||
          name.includes("tax") ||
          name.includes("shipping") ||
          name.includes("platform fee")
        ) {
          return acc;
        }
        return acc + (Number(c.amount) || 0);
      }, 0);

      const userDoc = order.user;
      const userId = userDoc?._id
        ? String(userDoc._id)
        : order.user
        ? String(order.user)
        : null;

      const customerName =
        order.customerDetails?.name ||
        userDoc?.name ||
        "Customer";

      const customerEmail =
        order.customerDetails?.email ||
        userDoc?.email ||
        "";

      const customerPhone =
        order.customerDetails?.phone ||
        userDoc?.phone ||
        "";

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        userId,
        orderDate: order.createdAt,
        // Three Core Figures
        productValue: Number((order.subtotal || 0).toFixed(2)),
        customerPaid: Number(customerPaid.toFixed(2)),
        adminFeeEarnings: Number(adminFeeEarnings.toFixed(2)),
        // Other Essential Breakdown Figures
        discount: Number((order.coupon?.discount || 0).toFixed(2)),
        discountedProductValue: Number((order.discountedSubtotal || order.subtotal || 0).toFixed(2)),
        tax: Number((order.taxAmount || 0).toFixed(2)),
        platformFee: Number((order.platformFee || 0).toFixed(2)),
        additionalEligibleFees: Number(additionalEligibleFees.toFixed(2)),
        shipping: Number((order.shippingFee || 0).toFixed(2)),
        customerTotal: Number((order.totalAmount || 0).toFixed(2)),
        itemCount: Array.isArray(order.items) ? order.items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) : (order.items?.length || 1),
        // Status & Metadata
        isCollected,
        paymentStatus: order.paymentStatus || "pending",
        paymentMethod: order.paymentMethod || "cod",
        orderStatus: order.orderStatus || "Pending",
        transactionId: order.paymentDetails?.razorpayPaymentId || order.paymentDetails?.razorpayOrderId || null,
        chargesBreakdown: charges,
      };
    });

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error("Earnings orders error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve earnings orders.",
    });
  }
};

/**
 * GET /api/admin/earnings/chart
 * Chronological timeline chart: Day (7 days), Month (12 months), Year (5 years).
 */
export const getEarningsChart = async (req, res) => {
  try {
    const { mode = "day", date, metric = "totalCollected" } = req.query;

    let slots = [];
    if (mode === "month") {
      slots = generateMonthSlots(date);
    } else if (mode === "year") {
      slots = generateYearSlots(date);
    } else {
      slots = generateDaySlots(date);
    }

    const windowStart = slots[0].start;
    const windowEnd = slots[slots.length - 1].end;

    // Fetch orders overlapping with window
    const orders = await Order.find({
      $or: [
        { createdAt: { $gte: windowStart, $lte: windowEnd } },
        { "paymentDetails.verifiedAt": { $gte: windowStart, $lte: windowEnd } },
        { updatedAt: { $gte: windowStart, $lte: windowEnd } },
      ],
    }).lean();

    orders.forEach((order) => {
      const isCollected = isOrderPaidAndCollected(order);
      const customerPaid = isCollected ? Number(order.totalAmount || 0) : 0;
      const productRevenue = isCollected ? Number(order.discountedSubtotal || order.subtotal || 0) : 0;
      const platformFee = isCollected ? Number(order.platformFee || 0) : 0;
      const adminFee = isCollected ? calculateOrderEligibleFee(order) : 0;

      // Reliable collection timestamp
      const collDate = getOrderCollectionDate(order);
      const paymentTime = collDate ? collDate.getTime() : null;

      const creationTime = new Date(order.createdAt).getTime();

      for (const slot of slots) {
        const slotStart = slot.start.getTime();
        const slotEnd = slot.end.getTime();

        // Count order placement
        if (creationTime >= slotStart && creationTime <= slotEnd) {
          slot.orderCount += 1;
          if (!isCollected && order.orderStatus !== "Cancelled") {
            slot.pendingAmount += Number(order.totalAmount || 0);
          }
        }

        // Count actual payment collection
        if (isCollected && paymentTime && paymentTime >= slotStart && paymentTime <= slotEnd) {
          slot.totalCollected += customerPaid;
          slot.adminFeeEarnings += adminFee;
          slot.productRevenue += productRevenue;
          slot.platformFee += platformFee;
          slot.paidOrderCount += 1;
        }
      }
    });

    let hasData = false;
    const points = slots.map((slot) => {
      let metricVal = 0;
      if (metric === "adminFeeEarnings") {
        metricVal = slot.adminFeeEarnings;
      } else if (metric === "productRevenue") {
        metricVal = slot.productRevenue;
      } else if (metric === "platformFee") {
        metricVal = slot.platformFee;
      } else {
        metricVal = slot.totalCollected;
      }

      metricVal = Number(metricVal.toFixed(2));
      if (metricVal > 0 || slot.orderCount > 0) {
        hasData = true;
      }

      return {
        key: slot.key,
        label: slot.label,
        fullLabel: slot.fullLabel,
        isReference: slot.isReference,
        value: metricVal,
        totalCollected: Number(slot.totalCollected.toFixed(2)),
        adminFeeEarnings: Number(slot.adminFeeEarnings.toFixed(2)),
        productRevenue: Number(slot.productRevenue.toFixed(2)),
        platformFee: Number(slot.platformFee.toFixed(2)),
        pendingAmount: Number(slot.pendingAmount.toFixed(2)),
        orderCount: slot.orderCount,
        paidOrderCount: slot.paidOrderCount,
      };
    });

    res.json({
      success: true,
      mode,
      metric,
      referenceKey: slots[0].key,
      window: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      },
      hasData,
      points,
    });
  } catch (err) {
    console.error("Earnings chart error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to generate earnings chart data.",
    });
  }
};
