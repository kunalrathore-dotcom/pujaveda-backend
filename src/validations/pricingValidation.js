import Joi from "joi";

export const createChargeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .required()
    .messages({
      "string.empty": "Surcharge name is required",
      "string.min": "Surcharge name must be at least 2 characters",
      "string.max": "Surcharge name cannot exceed 60 characters",
      "any.required": "Surcharge name is required",
    }),
  key: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(40)
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .messages({
      "string.empty": "Charge unique key is required",
      "string.pattern.base": "Key must only contain lowercase letters, numbers, and underscores (e.g., gst_tax, platform_fee)",
      "any.required": "Charge unique key is required",
    }),
  type: Joi.string()
    .valid("percentage", "fixed", "flat")
    .required()
    .messages({
      "any.only": "Surcharge type must be either 'percentage' or 'fixed'",
      "any.required": "Surcharge type is required",
      "string.empty": "Surcharge type is required",
    }),
  value: Joi.number()
    .min(0.01)
    .required()
    .when("type", {
      is: "percentage",
      then: Joi.number().max(100).messages({
        "number.max": "Percentage surcharge cannot exceed 100%",
      }),
      otherwise: Joi.number().max(50000).messages({
        "number.max": "Fixed surcharge amount cannot exceed ₹50,000",
      }),
    })
    .messages({
      "number.base": "Surcharge amount or rate must be a valid number",
      "number.min": "Surcharge amount or rate must be greater than zero",
      "any.required": "Surcharge amount or rate is required",
    }),
  calculationBasis: Joi.string()
    .valid("discounted_subtotal", "subtotal", "fixed")
    .default("discounted_subtotal")
    .required()
    .messages({
      "any.only": "Calculation type must be 'discounted_subtotal', 'subtotal', or 'fixed'",
      "any.required": "Calculation type is required",
      "string.empty": "Calculation type is required",
    }),
  description: Joi.string()
    .trim()
    .max(300)
    .allow("")
    .optional()
    .messages({
      "string.max": "Customer explanation description cannot exceed 300 characters",
    }),
  isActive: Joi.boolean().default(true),
});

export const updateChargeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional(),
  key: Joi.string().trim().lowercase().min(2).max(40).pattern(/^[a-z0-9_]+$/).optional(),
  type: Joi.string().valid("percentage", "fixed", "flat").optional(),
  value: Joi.number()
    .min(0)
    .optional()
    .when("type", {
      is: "percentage",
      then: Joi.number().max(100),
      otherwise: Joi.number().max(50000),
    }),
  calculationBasis: Joi.string().valid("discounted_subtotal", "subtotal", "fixed").optional(),
  description: Joi.string().trim().max(300).allow("").optional(),
  isActive: Joi.boolean().optional(),
}).min(1);
