import Joi from "joi";
import { objectId } from "./commonValidation.js";

export const trackEventSchema = Joi.object({
  eventType: Joi.string().trim().max(100).required().messages({
    "string.empty": "Event type is required",
  }),
  category: Joi.string().trim().max(100).default("system"),
  description: Joi.string().trim().max(500).allow("").optional(),
  metadata: Joi.object().unknown(true).optional(),
});

export const auditQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow("").optional(),
  eventType: Joi.string().trim().max(100).allow("").optional(),
  category: Joi.string().trim().max(100).allow("").optional(),
  userId: Joi.string().custom(objectId).allow("").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
}).unknown(true);

