import crypto from "crypto";
import Razorpay from "razorpay";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { couponService } from "../services/couponService.js";
import { auditService } from "../services/auditService.js";
import { sendEmail } from "../services/emailService.js";
import { getOrderConfirmationEmail } from "./emailTemplates.js";

export const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const isRazorpayConfigured = () => {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

export const safeCompare = (received, expected) => {
  if (!received || !expected) return false;
  const a = Buffer.from(received, "hex");
  const b = Buffer.from(expected, "hex");

  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

export const verifyCheckoutSignature = ({ orderId, paymentId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Razorpay key secret is missing from environment variables.");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return safeCompare(signature, expected);
};

export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !Buffer.isBuffer(rawBody) || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return safeCompare(signature, expected);
};

/**
 * Idempotently confirms captured payment and marks the associated Order as paid.
 */
export const confirmCapturedPayment = async ({ gatewayOrderId, gatewayPaymentId }) => {
  let outcome = "confirmed";

  const payment = await Payment.findOne({ gatewayOrderId });
  if (!payment) {
    return { outcome: "payment_not_found" };
  }

  if (payment.gatewayPaymentId && payment.gatewayPaymentId !== gatewayPaymentId) {
    return { outcome: "payment_id_mismatch" };
  }

  if (payment.status === "captured") {
    return {
      outcome:
        payment.reconciliationStatus === "pending"
          ? "captured_needs_reconciliation"
          : "already_processed",
      orderId: payment.orderId,
    };
  }

  const order = await Order.findById(payment.orderId);
  const now = new Date();

  if (!order) {
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.status = "captured";
    payment.verifiedAt = now;
    payment.reconciliationStatus = "pending";
    payment.reconciliationReason = "Captured payment has no corresponding Order in database";
    await payment.save();
    return { outcome: "captured_needs_reconciliation" };
  }

  if (order.orderStatus === "Cancelled") {
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.status = "captured";
    payment.verifiedAt = now;
    payment.reconciliationStatus = "pending";
    payment.reconciliationReason = "Payment was captured after Order was already Cancelled";
    await payment.save();
    return { outcome: "captured_needs_reconciliation", orderId: order._id };
  }

  // Update payment record
  payment.gatewayPaymentId = gatewayPaymentId;
  payment.status = "captured";
  payment.verifiedAt = now;
  payment.reconciliationStatus = "not_required";
  payment.reconciliationReason = null;
  await payment.save();

  // Update order record
  order.paymentStatus = "paid";
  if (order.orderStatus === "Pending") {
    order.orderStatus = "Processing";
  }
  order.paymentDetails = {
    razorpayOrderId: gatewayOrderId,
    razorpayPaymentId: gatewayPaymentId,
    verifiedAt: now,
  };
  await order.save();

  // Send Order Confirmation Email (idempotent, non-blocking)
  if (!order.emailNotification?.sent) {
    let recipientEmail = order.customerDetails?.email;
    if (!recipientEmail && order.user) {
      try {
        const orderUser = await User.findById(order.user).select("email");
        recipientEmail = orderUser?.email;
      } catch (userErr) {
        console.warn("[PaymentUtility] Failed to fetch user for order confirmation email:", userErr.message);
      }
    }

    if (recipientEmail) {
      try {
        const storefrontUrl = process.env.FRONTEND_USER_URL || "https://pujaveda.in";
        const emailContent = getOrderConfirmationEmail({
          order,
          storefrontUrl,
        });

        await sendEmail({
          to: recipientEmail,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        order.emailNotification = {
          sent: true,
          sentAt: new Date(),
          recipientEmail,
          attempts: (order.emailNotification?.attempts || 0) + 1,
          lastError: null,
        };
        await order.save();
      } catch (emailErr) {
        console.error(`[PaymentUtility] Order confirmation email delivery failed: ${emailErr.message}`);
        order.emailNotification = {
          sent: false,
          sentAt: null,
          recipientEmail,
          attempts: (order.emailNotification?.attempts || 0) + 1,
          lastError: emailErr.message,
        };
        await order.save();
      }
    }
  }

  // Atomically and idempotently record coupon redemption upon successful payment
  if (order.coupon?.code) {
    try {
      await couponService.recordRedemption({
        couponCode: order.coupon.code,
        user: order.user,
        order,
        discountAmount: order.coupon.discount || 0,
        orderTotal: order.totalAmount,
      });
    } catch (couponErr) {
      console.warn("[PaymentUtility] Coupon redemption record error:", couponErr.message);
    }
  }

  // Record audit log for successful payment
  await auditService.log({
    user: order.user,
    eventType: "PAYMENT_SUCCESS",
    category: "payment",
    description: `Payment captured for order ${order.orderNumber} (₹${order.totalAmount})`,
    entityType: "Order",
    entityId: order._id,
    metadata: {
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      gatewayOrderId,
      gatewayPaymentId,
    },
  });

  return {
    outcome: "confirmed",
    orderId: order._id,
    order,
  };
};

/**
 * Marks payment as failed and updates Order status if pending.
 */
export const markPaymentFailed = async ({ gatewayOrderId, reason }) => {
  const failureReason = reason || "Payment failed";

  const payment = await Payment.findOneAndUpdate(
    {
      gatewayOrderId,
      status: { $in: ["created", "authorized"] },
    },
    {
      $set: {
        status: "failed",
        failureReason,
      },
    },
    { new: true }
  );

  if (payment?.orderId) {
    await Order.findByIdAndUpdate(payment.orderId, {
      $set: {
        paymentStatus: "failed",
      },
    });
  }

  await auditService.log({
    eventType: "PAYMENT_FAILED",
    category: "payment",
    description: `Payment failed for gateway order ${gatewayOrderId}. Reason: ${failureReason}`,
    entityType: "Payment",
    metadata: { gatewayOrderId, failureReason },
  });

  return payment;
};
