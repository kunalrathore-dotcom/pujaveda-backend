import Joi from "joi";

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one item is required in the order",
    }),
  customerDetails: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().trim().email().max(254).required(),
    phone: Joi.string().trim().max(15).allow("").optional(),
  }).required(),
  shippingAddress: Joi.object({
    name: Joi.string().trim().max(100).allow("").optional(),
    phone: Joi.string().trim().max(20).allow("").optional(),
    street: Joi.string().trim().max(150).required().messages({
      "string.empty": "Street address is required",
    }),
    city: Joi.string().trim().max(60).required().messages({
      "string.empty": "City is required",
    }),
    state: Joi.string().trim().max(60).required().messages({
      "string.empty": "State is required",
    }),
    postalCode: Joi.string().trim().max(6).required().messages({
      "string.empty": "PIN / Postal code is required",
    }),
    country: Joi.string().trim().max(50).default("India"),
  }).required(),
  paymentMethod: Joi.string()
    .valid("cod", "razorpay", "demo_online")
    .default("cod"),
  couponCode: Joi.string().trim().max(30).allow("").optional(),
  couponCodes: Joi.forbidden().messages({
    "any.unknown": "Only one coupon can be applied per checkout.",
  }),
  coupons: Joi.forbidden().messages({
    "any.unknown": "Only one coupon can be applied per checkout.",
  }),
});

export const getAllOrdersQuerySchema = Joi.object({
  status: Joi.string().valid("all", "Pending", "Processing", "Delivered", "Cancelled").optional(),
  paymentStatus: Joi.string().valid("all", "paid", "pending", "failed").optional(),
  search: Joi.string().trim().max(100).allow("").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  startDate: Joi.string().allow("").optional(),
  endDate: Joi.string().allow("").optional(),
});

export const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("Pending", "Processing", "Delivered", "Cancelled")
    .required()
    .messages({
      "any.only": "Status must be Pending, Processing, Delivered, or Cancelled",
    }),
});

export const orderIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});
