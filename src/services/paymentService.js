import {
  getRazorpayClient,
  isRazorpayConfigured,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  confirmCapturedPayment,
  markPaymentFailed,
} from "../utils/paymentUtility.js";

export const paymentService = {
  isConfigured() {
    return isRazorpayConfigured();
  },

  async createRazorpayOrder({ amount, receipt, notes = {} }) {
    if (!isRazorpayConfigured()) {
      throw new Error(
        "Razorpay credentials are not configured in environment variables. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }

    const razorpay = getRazorpayClient();
    const options = {
      amount: Math.round(Number(amount) * 100), // amount in paise
      currency: "INR",
      receipt: String(receipt).slice(0, 40),
      notes,
    };

    const order = await razorpay.orders.create(options);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  },

  async fetchPayment(paymentId) {
    if (!isRazorpayConfigured()) {
      throw new Error("Razorpay credentials are not configured.");
    }
    const razorpay = getRazorpayClient();
    return razorpay.payments.fetch(paymentId);
  },

  verifyCheckoutSignature,
  verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId, paymentId, signature } = {}) {
    return verifyCheckoutSignature({
      orderId: orderId || razorpayOrderId,
      paymentId: paymentId || razorpayPaymentId,
      signature: signature || razorpaySignature,
    });
  },
  verifyWebhookSignature,
  confirmCapturedPayment,
  markPaymentFailed,
};
