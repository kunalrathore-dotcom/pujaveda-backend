import Joi from "joi";

// Helper for validating MongoDB ObjectId
export const objectId = (value, helpers) => {
  if (!value || typeof value !== "string") {
    return helpers.error("any.invalid");
  }
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

// Common pagination and search query validation
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).allow("").optional(),
  sortBy: Joi.string().trim().max(50).optional(),
  sortOrder: Joi.string().valid("asc", "desc", "1", "-1").optional(),
}).unknown(true);
