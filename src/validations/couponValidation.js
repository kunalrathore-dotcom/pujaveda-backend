import Joi from "joi";
import { objectId } from "./commonValidation.js";

export const createCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(25)
    .pattern(/^[A-Z0-9_-]+$/)
    .required()
    .messages({
      "string.empty": "Coupon code is required",
      "string.min": "Coupon code must be at least 3 characters",
      "string.max": "Coupon code cannot exceed 25 characters",
      "string.pattern.base": "Coupon code must contain only uppercase letters, numbers, hyphens, and underscores",
    }),
  discountType: Joi.string()
    .valid("percentage", "flat")
    .required()
    .messages({
      "any.only": "Discount type must be either 'percentage' or 'flat'",
      "any.required": "Discount type is required",
    }),
  discountValue: Joi.number()
    .positive()
    .required()
    .when("discountType", {
      is: "percentage",
      then: Joi.number().min(1).max(100).messages({
        "number.min": "Percentage discount must be at least 1%",
        "number.max": "Percentage discount cannot exceed 100%",
      }),
      otherwise: Joi.number().min(1).messages({
        "number.min": "Flat discount amount must be at least ₹1",
      }),
    })
    .messages({
      "number.base": "Discount value must be a valid number",
      "number.positive": "Discount value must be greater than zero",
    }),
  minOrderValue: Joi.number().min(0).default(0),
  minCartValue: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).allow(null).optional(),
  maxDiscountAmount: Joi.number().min(0).allow(null).optional(),
  expiryDate: Joi.date()
    .iso()
    .required()
    .messages({
      "date.base": "Please provide a valid expiry date",
      "any.required": "Expiry date is required",
    }),
  usageLimit: Joi.number().integer().min(0).allow(null).default(null),
  perUserLimit: Joi.number().integer().min(1).default(1),
  applicableCategories: Joi.array().items(Joi.string().custom(objectId)).default([]),
  applicableProducts: Joi.array().items(Joi.string().custom(objectId)).default([]),
  isActive: Joi.boolean().default(true),
  description: Joi.string().trim().max(300).allow("").optional(),
});

export const updateCouponSchema = createCouponSchema.fork(
  ["code", "discountType", "discountValue", "expiryDate"],
  (schema) => schema.optional()
);

export const validateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Please enter a coupon code",
  }),
  cartSubtotal: Joi.number().min(0).optional(),
  cartItems: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().required(),
        categoryId: Joi.string().trim().allow(null, "").optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(1).required(),
      }).unknown(true)
    )
    .optional(),
});

export const couponOffersSchema = Joi.object({
  cartItems: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().required(),
        categoryId: Joi.string().trim().allow(null, "").optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(1).required(),
      }).unknown(true)
    )
    .required()
    .messages({
      "array.base": "Cart items must be an array",
      "any.required": "Cart items are required to calculate coupon offers",
    }),
});

