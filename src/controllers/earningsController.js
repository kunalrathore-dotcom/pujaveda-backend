import mongoose from "mongoose";
import { Order } from "../models/Order.js";

/**
 * Escapes regex special characters to prevent ReDoS or query injection.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses an IST date string or Date object into a reliable date representation.
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
 * Generates 7 daily slots starting from reference date (Day 0 + next 6 days).
 * Uses IST (+05:30) offset for accurate local Indian business day calculations.
 */
function generateDaySlots(dateStr) {
  const { y, m, d } = parseDateParts(dateStr);
  const slots = [];

  for (let i = 0; i < 7; i++) {
    // Construct UTC date and compute offset
    const current = new Date(Date.UTC(y, m - 1, d + i, 0, 0, 0, 0));
    // IST start and end for this day
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

    // Start of month in IST
    const start = new Date(`${year}-${monthStr}-01T00:00:00.000+05:30`);

    // End of month in IST
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
 * Summary metrics: Total Collected, Product Subtotal, Discount Given, Taxes Collected, Platform Fee, Shipping Collected.
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

    const aggregation = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalCollected: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
            },
          },
          productSubtotal: { $sum: { $ifNull: ["$subtotal", 0] } },
          discountGiven: { $sum: { $ifNull: ["$coupon.discount", 0] } },
          taxesCollected: { $sum: { $ifNull: ["$taxAmount", 0] } },
          platformFee: { $sum: { $ifNull: ["$platformFee", 0] } },
          shippingCollected: { $sum: { $ifNull: ["$shippingFee", 0] } },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$totalAmount", 0],
            },
          },
          paidOrdersCount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
            },
          },
          pendingOrdersCount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0],
            },
          },
          failedOrdersCount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const result = aggregation[0] || {
      totalOrders: 0,
      totalCollected: 0,
      productSubtotal: 0,
      discountGiven: 0,
      taxesCollected: 0,
      platformFee: 0,
      shippingCollected: 0,
      pendingAmount: 0,
      paidOrdersCount: 0,
      pendingOrdersCount: 0,
      failedOrdersCount: 0,
    };

    res.json({
      success: true,
      summary: {
        totalCollected: Number(result.totalCollected.toFixed(2)),
        productSubtotal: Number(result.productSubtotal.toFixed(2)),
        discountGiven: Number(result.discountGiven.toFixed(2)),
        taxesCollected: Number(result.taxesCollected.toFixed(2)),
        platformFee: Number(result.platformFee.toFixed(2)),
        shippingCollected: Number(result.shippingCollected.toFixed(2)),
        pendingAmount: Number(result.pendingAmount.toFixed(2)),
        totalOrders: result.totalOrders,
        paidOrdersCount: result.paidOrdersCount,
        pendingOrdersCount: result.pendingOrdersCount,
        failedOrdersCount: result.failedOrdersCount,
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
 * Paginated list of latest orders with complete financial columns directly visible.
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Format financial breakdown columns strictly avoiding double-counting
    const orders = rawOrders.map((order) => {
      // Calculate non-tax, non-platform additional charges from chargesBreakdown
      const charges = Array.isArray(order.chargesBreakdown) ? order.chargesBreakdown : [];
      const additionalCharges = charges.reduce((acc, c) => {
        const key = (c.key || "").toLowerCase();
        if (["gst", "tax", "platform_fee", "shipping"].includes(key)) {
          return acc;
        }
        return acc + (Number(c.amount) || 0);
      }, 0);

      const isPaid = order.paymentStatus === "paid";
      const amountPaid = isPaid ? Number(order.totalAmount || 0) : 0;

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerDetails?.name || "Customer",
        customerEmail: order.customerDetails?.email || "",
        customerPhone: order.customerDetails?.phone || "",
        userId: order.user ? String(order.user) : null,
        orderDate: order.createdAt,
        subtotal: Number((order.subtotal || 0).toFixed(2)),
        discount: Number((order.coupon?.discount || 0).toFixed(2)),
        taxAmount: Number((order.taxAmount || 0).toFixed(2)),
        platformFee: Number((order.platformFee || 0).toFixed(2)),
        additionalCharges: Number(additionalCharges.toFixed(2)),
        shippingFee: Number((order.shippingFee || 0).toFixed(2)),
        totalAmount: Number((order.totalAmount || 0).toFixed(2)),
        amountPaid: Number(amountPaid.toFixed(2)),
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
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
 * Reference period is always point 0 (first), followed by chronological future periods.
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

    // Map each order to its respective slot
    orders.forEach((order) => {
      const isPaid = order.paymentStatus === "paid";
      const totalAmount = Number(order.totalAmount || 0);
      const productRevenue = Number(order.discountedSubtotal || order.subtotal || 0);
      const platformFee = Number(order.platformFee || 0);

      // Payment date: verifiedAt -> updatedAt (if paid) -> createdAt
      let paymentTime = null;
      if (isPaid) {
        if (order.paymentDetails?.verifiedAt) {
          paymentTime = new Date(order.paymentDetails.verifiedAt).getTime();
        } else if (order.updatedAt) {
          paymentTime = new Date(order.updatedAt).getTime();
        } else {
          paymentTime = new Date(order.createdAt).getTime();
        }
      }

      const creationTime = new Date(order.createdAt).getTime();

      // Find slot for order creation
      for (const slot of slots) {
        const slotStart = slot.start.getTime();
        const slotEnd = slot.end.getTime();

        if (creationTime >= slotStart && creationTime <= slotEnd) {
          slot.orderCount += 1;
          if (!isPaid) {
            slot.pendingAmount += totalAmount;
          }
        }

        // Find slot for payment collection
        if (isPaid && paymentTime && paymentTime >= slotStart && paymentTime <= slotEnd) {
          slot.totalCollected += totalAmount;
          slot.productRevenue += productRevenue;
          slot.platformFee += platformFee;
          slot.paidOrderCount += 1;
        }
      }
    });

    // Compute metric values and clean responses
    let hasData = false;
    const points = slots.map((slot) => {
      let metricVal = 0;
      if (metric === "productRevenue") {
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
