import Joi from "joi";

export const getEarningsSummarySchema = Joi.object({
  startDate: Joi.string().isoDate().allow("").optional(),
  endDate: Joi.string().isoDate().allow("").optional(),
});

export const getEarningsOrdersSchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  startDate: Joi.string().allow("").optional(),
  endDate: Joi.string().allow("").optional(),
  paymentStatus: Joi.string().valid("all", "paid", "pending", "failed").optional(),
  orderStatus: Joi.string().valid("all", "Pending", "Processing", "Delivered", "Cancelled").optional(),
});

export const getEarningsChartSchema = Joi.object({
  mode: Joi.string().valid("day", "month", "year").default("day").optional(),
  date: Joi.string().trim().max(20).allow("").optional(),
  metric: Joi.string()
    .valid("totalCollected", "adminFeeEarnings", "productRevenue", "platformFee")
    .default("totalCollected")
    .optional(),
});

