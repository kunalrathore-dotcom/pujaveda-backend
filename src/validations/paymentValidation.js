import Joi from "joi";

export const createPaymentOrderSchema = Joi.object({
  orderId: Joi.string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Order ID is required",
      "string.pattern.base": "Invalid Order ID format",
    }),
});

export const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().trim().optional(),
  razorpay_order_id: Joi.string().trim().optional(),
  razorpay_payment_id: Joi.string().trim().optional(),
  razorpay_signature: Joi.string().trim().optional(),
  razorpayOrderId: Joi.string().trim().optional(),
  razorpayPaymentId: Joi.string().trim().optional(),
  razorpaySignature: Joi.string().trim().optional(),
})
  .or("razorpay_order_id", "razorpayOrderId")
  .or("razorpay_payment_id", "razorpayPaymentId")
  .or("razorpay_signature", "razorpaySignature");
