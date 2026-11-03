import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Cart } from "../models/Cart.js";
import { Payment } from "../models/Payment.js";
import { paymentService } from "../services/paymentService.js";
import { pricingService } from "../services/pricingService.js";
import { couponService } from "../services/couponService.js";
import { auditService } from "../services/auditService.js";
import { isOrderPaidAndCollected, calculateOrderEligibleFee } from "./earningsController.js";

export const quoteOrder = async (req, res) => {
  try {
    const { items } = req.body;
    // Customer Storefront: Coupon discounts disabled. Calculate authoritative pricing without coupons.
    const quote = await pricingService.calculateOrderPricing({
      rawItems: items,
      user: req.user,
    });
    return res.json({
      success: true,
      quote,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

export const createOrder = async (req, res) => {
  const { items, customerDetails, shippingAddress, paymentMethod = "razorpay" } = req.body;

  if (paymentMethod === "cod") {
    return res.status(400).json({
      success: false,
      message: "Cash on delivery (COD) is not accepted. Only online payment via Razorpay is supported.",
    });
  }

  if (!items || !items.length) {
    return res.status(400).json({
      success: false,
      message: "Order must contain at least one product.",
    });
  }

  // Authoritatively calculate order pricing breakdown via pricingService (ignoring any passed coupon codes)
  let quote;
  try {
    quote = await pricingService.calculateOrderPricing({
      rawItems: items,
      user: req.user,
      includeOffers: false,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }

  const {
    items: processedItems,
    subtotal,
    coupon,
    discountedSubtotal,
    taxAmount,
    platformFee,
    chargesBreakdown,
    shippingFee,
    totalAmount,
  } = quote;

  // Generate unique order number
  const count = await Order.countDocuments();
  const orderNumber = `PLX-${1001 + count}`;

  let paymentDetails = {};
  let paymentStatus = "pending";

  if (paymentMethod === "demo_online") {
    paymentStatus = "paid";
  }

  // Atomically decrement stock
  for (const item of processedItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Create order with immutable breakdown
  const order = await Order.create({
    orderNumber,
    user: req.user._id,
    customerDetails,
    shippingAddress,
    items: processedItems,
    subtotal,
    coupon: coupon
      ? {
          code: coupon.code || "",
          discountType: coupon.discountType || "",
          discountValue: coupon.discountValue || 0,
          maxDiscount: coupon.maxDiscount || null,
          discount: coupon.discount || 0,
          eligibleSubtotal: coupon.eligibleSubtotal || 0,
          eligibleProducts: coupon.eligibleProducts || [],
        }
      : { code: "", discountType: "", discountValue: 0, discount: 0, eligibleSubtotal: 0, eligibleProducts: [] },
    discountedSubtotal,
    taxAmount,
    platformFee,
    chargesBreakdown,
    shippingFee,
    totalAmount,
    paymentMethod,
    paymentStatus,
    paymentDetails,
    orderStatus: "Pending",
  });

  // Clear user's cart
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  // If Razorpay requested and configured
  let razorpayOrder = null;
  if (paymentMethod === "razorpay" && paymentService.isConfigured()) {
    try {
      razorpayOrder = await paymentService.createRazorpayOrder({
        amount: totalAmount,
        receipt: orderNumber,
        notes: {
          orderId: order._id.toString(),
          orderNumber,
          userId: req.user._id.toString(),
          couponCode: coupon?.code || "",
        },
      });

      // Update Order with Razorpay order ID
      order.paymentDetails.razorpayOrderId = razorpayOrder.orderId;
      await order.save();

      // CRITICAL: Persist Payment record in MongoDB BEFORE returning to frontend
      await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        gateway: "razorpay",
        gatewayOrderId: razorpayOrder.orderId,
        amount: totalAmount,
        currency: razorpayOrder.currency || "INR",
        status: "created",
      });
    } catch (err) {
      console.warn(`[Order] Razorpay order creation failed:`, err.message);
    }
  }

  // For demo_online, record coupon usage immediately upon order placement
  if (paymentMethod === "demo_online" && coupon?.code) {
    try {
      await couponService.recordRedemption({
        couponCode: coupon.code,
        user: req.user,
        order,
        discountAmount: coupon.discount,
        orderTotal: totalAmount,
      });
    } catch (couponErr) {
      console.warn("[Order] Failed to record coupon redemption:", couponErr.message);
    }
  }

  // Audit logging for order placement
  await auditService.log({
    req,
    user: req.user,
    eventType: "ORDER_PLACED",
    category: "order",
    description: `Order ${orderNumber} placed by ${customerDetails.name} for ₹${totalAmount}`,
    entityType: "Order",
    entityId: order._id,
    metadata: {
      orderNumber,
      totalAmount,
      subtotal,
      discount: coupon?.discount || 0,
      couponCode: coupon?.code || "",
      paymentMethod,
    },
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully.",
    order,
    quote,
    razorpayOrder,
  });
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("items.product", "name images price")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    orders,
    count: orders.length,
  });
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;

  let order = null;
  const populateFields = [
    { path: "items.product", select: "name images price slug stock" },
    { path: "user", select: "name email phone role createdAt" },
  ];

  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id).populate(populateFields);
  } else {
    order = await Order.findOne({ orderNumber: id }).populate(populateFields);
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  // Ensure customer can only view their own order
  if (req.user.role !== "admin" && order.user?._id?.toString() !== req.user._id.toString() && order.user?.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own orders.",
    });
  }

  const orderObj = order.toObject();
  const isCollected = isOrderPaidAndCollected(order);
  const customerPaid = isCollected ? Number(order.totalAmount || 0) : 0;
  const adminFeeEarnings = isCollected ? calculateOrderEligibleFee(order) : 0;
  const transactionId = order.paymentDetails?.razorpayPaymentId || order.paymentDetails?.razorpayOrderId || null;

  orderObj.productValue = Number((order.subtotal || 0).toFixed(2));
  orderObj.customerPaid = Number(customerPaid.toFixed(2));
  orderObj.adminFeeEarnings = Number(adminFeeEarnings.toFixed(2));
  orderObj.isCollected = isCollected;
  orderObj.transactionId = transactionId;

  res.json({
    success: true,
    order: orderObj,
  });
};

export const getAllOrders = async (req, res) => {
  const { status, paymentStatus, search, page = 1, limit = 50, startDate, endDate } = req.query;

  const filter = {};
  if (status && status !== "all") {
    filter.orderStatus = status;
  }

  if (paymentStatus && paymentStatus !== "all") {
    filter.paymentStatus = paymentStatus;
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { orderNumber: { $regex: q, $options: "i" } },
      { "customerDetails.name": { $regex: q, $options: "i" } },
      { "customerDetails.email": { $regex: q, $options: "i" } },
      { "paymentDetails.razorpayOrderId": { $regex: q, $options: "i" } },
      { "paymentDetails.razorpayPaymentId": { $regex: q, $options: "i" } },
    ];
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

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    orders,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  });
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  const previousStatus = order.orderStatus;

  // If status is updated to Cancelled and wasn't previously cancelled, restore stock!
  if (orderStatus === "Cancelled" && previousStatus !== "Cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }

  // If order was cancelled and now changed to something else, re-deduct stock if available
  if (previousStatus === "Cancelled" && orderStatus !== "Cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  order.orderStatus = orderStatus;

  // COD orders: mark paid on Delivered; revert to pending if transitioned away from Delivered
  if (order.paymentMethod === "cod") {
    if (orderStatus === "Delivered") {
      order.paymentStatus = "paid";
    } else if (previousStatus === "Delivered" && orderStatus !== "Delivered") {
      order.paymentStatus = "pending";
    }
  }

  await order.save();

  res.json({
    success: true,
    message: `Order status updated to '${orderStatus}'.`,
    order,
  });
};

export const verifyPayment = async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  const isValid = paymentService.verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValid) {
    order.paymentStatus = "failed";
    await order.save();
    return res.status(400).json({
      success: false,
      message: "Payment signature verification failed.",
    });
  }

  // Confirm capture using paymentService
  await paymentService.confirmCapturedPayment({
    gatewayOrderId: razorpayOrderId,
    gatewayPaymentId: razorpayPaymentId,
  });

  const updatedOrder = await Order.findById(orderId);

  res.json({
    success: true,
    message: "Payment verified successfully.",
    order: updatedOrder,
  });
};
