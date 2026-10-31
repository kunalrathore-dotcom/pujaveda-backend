import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().trim().required().messages({
    "string.empty": "Product ID is required",
  }),
  quantity: Joi.number().integer().min(1).max(50).default(1),
});

export const updateQuantitySchema = Joi.object({
  productId: Joi.string().trim().required().messages({
    "string.empty": "Product ID is required",
  }),
  quantity: Joi.number().integer().min(1).max(50).required().messages({
    "number.min": "Quantity must be at least 1",
  }),
});

export const removeCartParamSchema = Joi.object({
  productId: Joi.string().trim().required(),
});

