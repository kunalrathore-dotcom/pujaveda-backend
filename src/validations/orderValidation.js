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
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Please enter your name",
      "string.min": "Name must contain at least 2 characters",
      "any.required": "Please enter your name",
    }),
    email: Joi.string().trim().email().max(254).required().messages({
      "string.empty": "Please enter your email address",
      "string.email": "Please enter a valid email address",
      "any.required": "Please enter your email address",
    }),
    phone: Joi.string()
      .trim()
      .pattern(/^(?:\+91[\-\s]?)?[6-9]\d{9}$/)
      .required()
      .messages({
        "string.empty": "Please enter your phone number",
        "string.pattern.base": "Please enter a valid 10-digit mobile number",
        "any.required": "Please enter your phone number",
      }),
  }).required(),
  shippingAddress: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Please enter the recipient's name",
      "string.min": "Recipient name must be at least 2 characters",
      "any.required": "Please enter the recipient's name",
    }),
    phone: Joi.string()
      .trim()
      .pattern(/^(?:\+91[\-\s]?)?[6-9]\d{9}$/)
      .required()
      .messages({
        "string.empty": "Please enter your phone number",
        "string.pattern.base": "Please enter a valid 10-digit mobile number",
        "any.required": "Please enter your phone number",
      }),
    street: Joi.string().trim().min(3).max(150).required().messages({
      "string.empty": "Please enter your street or house address",
      "string.min": "Street address must be at least 3 characters",
      "any.required": "Please enter your street or house address",
    }),
    city: Joi.string().trim().min(2).max(60).required().messages({
      "string.empty": "Please enter your city",
      "any.required": "Please enter your city",
    }),
    state: Joi.string().trim().min(2).max(60).required().messages({
      "string.empty": "Please enter your state",
      "any.required": "Please enter your state",
    }),
    postalCode: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        "string.empty": "Please enter your 6-digit PIN code",
        "string.pattern.base": "Please enter a valid 6-digit PIN code",
        "any.required": "Please enter your 6-digit PIN code",
      }),
    country: Joi.string().trim().max(50).default("India"),
  }).required(),
  paymentMethod: Joi.string()
    .valid("razorpay")
    .default("razorpay")
    .messages({
      "any.only": "Cash on delivery (COD) is not accepted. Only online payment via Razorpay is supported.",
    }),
  couponCode: Joi.forbidden().messages({
    "any.unknown": "Coupons are not supported for storefront checkout.",
  }),
  couponCodes: Joi.forbidden().messages({
    "any.unknown": "Coupons are not supported for storefront checkout.",
  }),
  coupons: Joi.forbidden().messages({
    "any.unknown": "Coupons are not supported for storefront checkout.",
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
