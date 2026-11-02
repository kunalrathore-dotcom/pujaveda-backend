import Joi from "joi";

export const createChargeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(60)
    .required()
    .messages({
      "string.empty": "Charge name is required",
      "string.min": "Charge name must be at least 2 characters",
      "string.max": "Charge name cannot exceed 60 characters",
    }),
  key: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(50)
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .messages({
      "string.empty": "Charge unique key is required",
      "string.pattern.base": "Key must only contain lowercase letters, numbers, and underscores (e.g., gst_tax, platform_fee)",
    }),
  type: Joi.string()
    .valid("percentage", "flat")
    .required()
    .messages({
      "any.only": "Charge type must be either 'percentage' or 'flat'",
      "any.required": "Charge type is required",
    }),
  value: Joi.number()
    .min(0)
    .required()
    .when("type", {
      is: "percentage",
      then: Joi.number().max(100).messages({
        "number.max": "Percentage charge cannot exceed 100%",
      }),
    })
    .messages({
      "number.base": "Charge value must be a valid number",
      "number.min": "Charge value cannot be negative",
    }),
  description: Joi.string().trim().max(300).allow("").optional(),
  isActive: Joi.boolean().default(true),
});

export const updateChargeSchema = createChargeSchema.fork(
  ["name", "key", "type", "value"],
  (schema) => schema.optional()
);

