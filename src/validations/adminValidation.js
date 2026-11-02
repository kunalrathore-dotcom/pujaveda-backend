import Joi from "joi";
import { objectId } from "./commonValidation.js";

export const customerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).allow("").optional(),
  sortBy: Joi.string().trim().max(50).default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc", "1", "-1").default("desc"),
}).unknown(true);

export const customerParamsSchema = Joi.object({
  id: Joi.string().custom(objectId).required().messages({
    "any.invalid": "Invalid customer identifier format",
    "any.required": "Customer identifier is required",
  }),
});

