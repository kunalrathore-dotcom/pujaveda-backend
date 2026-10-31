import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { paymentService } from "../services/paymentService.js";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "../utils/apiResponse.js";

export const createPaymentOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      paymentStatus: "pending",
    });

    if (!order) {
      return notFound(res, "Active pending order not found for payment.");
    }

    let existingPayment = await Payment.findOne({
      $or: [{ orderId: order._id }, { gatewayOrderId: order.paymentDetails?.razorpayOrderId }],
      status: { $in: ["created", "authorized", "captured"] },
    });

    if (existingPayment) {
      if (existingPayment.status === "captured") {
        return badRequest(res, "This order has already been paid and captured.");
      }

      return ok(res, "Payment order already exists.", {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: existingPayment.gatewayOrderId,
        paymentRecordId: existingPayment._id,
        amount: Math.round(existingPayment.amount * 100),
        currency: existingPayment.currency,
      });
    }

    const amountInRupees = Number(order.totalAmount);
    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      return badRequest(res, "Order total amount is invalid.");
    }

    const razorpayOrder = await paymentService.createRazorpayOrder({
      amount: amountInRupees,
      receipt: order.orderNumber,
      notes: {
        orderId: String(order._id),
        userId: String(userId),
        orderNumber: order.orderNumber,
      },
    });

    const payment = await Payment.create({
      orderId: order._id,
      userId,
      gateway: "razorpay",
      gatewayOrderId: razorpayOrder.orderId,
      amount: amountInRupees,
      currency: razorpayOrder.currency || "INR",
      status: "created",
    });

    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      razorpayOrderId: razorpayOrder.orderId,
    };
    await order.save();

    return created(res, "Razorpay payment order created successfully.", {
      keyId: razorpayOrder.keyId,
      orderId: razorpayOrder.orderId,
      paymentRecordId: payment._id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    console.error("[PaymentController] createPaymentOrder error:", error);
    return serverError(res, "Unable to create payment order. " + error.message);
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId: legacyOrderId,
      razorpayOrderId: legacyRazorpayOrderId,
      razorpayPaymentId: legacyRazorpayPaymentId,
      razorpaySignature: legacyRazorpaySignature,
    } = req.body;

    const orderId = razorpay_order_id || legacyRazorpayOrderId;
    const paymentId = razorpay_payment_id || legacyRazorpayPaymentId;
    const signature = razorpay_signature || legacyRazorpaySignature;

    if (!orderId || !paymentId || !signature) {
      return badRequest(res, "Missing required Razorpay payment credentials.");
    }

    // 1. First locate payment record by gatewayOrderId
    let payment = await Payment.findOne({ gatewayOrderId: orderId });

    // Resilient fallback: locate by internal orderId or order.paymentDetails.razorpayOrderId
    if (!payment && legacyOrderId) {
      const matchedOrder = await Order.findById(legacyOrderId);
      if (matchedOrder && (matchedOrder.paymentDetails?.razorpayOrderId === orderId || !matchedOrder.paymentDetails?.razorpayOrderId)) {
        payment = await Payment.create({
          orderId: matchedOrder._id,
          userId: matchedOrder.user,
          gateway: "razorpay",
          gatewayOrderId: orderId,
          amount: matchedOrder.totalAmount,
          currency: "INR",
          status: "created",
        });
      }
    }

    if (!payment) {
      return notFound(res, "Payment order record not found in database.");
    }

    // 2. Timing-safe HMAC SHA-256 signature verification
    const isValidSignature = paymentService.verifyCheckoutSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      payment.status = "failed";
      payment.failureReason = "Invalid checkout signature";
      await payment.save();
      return badRequest(res, "Invalid payment signature verification failed.");
    }

    // 3. Fetch payment from Razorpay API to confirm capture, amount and currency
    const gatewayPayment = await paymentService.fetchPayment(paymentId);

    if (
      gatewayPayment.order_id !== orderId ||
      gatewayPayment.amount !== Math.round(payment.amount * 100) ||
      gatewayPayment.currency !== payment.currency
    ) {
      return badRequest(res, "Payment details do not match the server order record.");
    }

    if (gatewayPayment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: `Payment is not captured yet (current status: ${gatewayPayment.status}).`,
      });
    }

    // 4. Confirm captured payment idempotently and update Order
    const result = await paymentService.confirmCapturedPayment({
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
    });

    if (result.outcome === "captured_needs_reconciliation") {
      return res.status(409).json({
        success: false,
        message:
          "Payment was captured, but the associated order was cancelled or unavailable. Please contact customer support.",
      });
    }

    if (result.outcome === "payment_not_found" || result.outcome === "payment_id_mismatch") {
      return res.status(409).json({
        success: false,
        message: "Payment could not be matched to the order.",
      });
    }

    return ok(res, "Payment verified and order confirmed successfully.", {
      orderId: result.orderId || payment.orderId,
      order: result.order,
    });
  } catch (error) {
    console.error("[PaymentController] verifyPayment error:", error);
    return serverError(res, "Unable to verify payment: " + error.message);
  }
};

export const handlePaymentWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!paymentService.verifyWebhookSignature(req.rawBody, signature)) {
    console.error("[PaymentWebhook] Signature verification failed.");
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature.",
    });
  }

  try {
    const event = req.body?.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderEntity = req.body?.payload?.order?.entity;

      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        let localPayment = await Payment.findOne({ gatewayOrderId: orderId });

        // If localPayment is missing, attempt to reconcile using notes.orderId or Order query
        if (!localPayment) {
          const internalOrderId = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;
          let order = null;
          if (internalOrderId) {
            order = await Order.findById(internalOrderId);
          } else {
            order = await Order.findOne({ "paymentDetails.razorpayOrderId": orderId });
          }

          if (order) {
            localPayment = await Payment.create({
              orderId: order._id,
              userId: order.user,
              gateway: "razorpay",
              gatewayOrderId: orderId,
              amount: order.totalAmount,
              currency: "INR",
              status: "created",
            });
          }
        }

        if (localPayment && paymentEntity) {
          const gatewayPayment = await paymentService.fetchPayment(paymentId);

          if (
            gatewayPayment.status === "captured" &&
            gatewayPayment.order_id === orderId &&
            gatewayPayment.amount === Math.round(localPayment.amount * 100) &&
            gatewayPayment.currency === localPayment.currency
          ) {
            await paymentService.confirmCapturedPayment({
              gatewayOrderId: orderId,
              gatewayPaymentId: paymentId,
            });
          }
        }
      }
    }

    if (event === "payment.failed") {
      const entity = req.body?.payload?.payment?.entity;
      if (entity?.order_id) {
        await paymentService.markPaymentFailed({
          gatewayOrderId: entity.order_id,
          reason: entity.error_description || entity.error_reason,
        });
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("[PaymentWebhook] Processing error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};
