import Joi from "joi";

export const divineCardSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Card title is required",
    "string.min": "Title must be at least 2 characters",
  }),
  subtitle: Joi.string().trim().max(200).allow("").optional(),
  description: Joi.string().trim().max(500).allow("").optional(),
  image: Joi.string().trim().uri({ allowRelative: true }).required().messages({
    "string.empty": "Card image URL/path is required",
  }),
  link: Joi.string().trim().allow("").optional(),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

export const updateDivineCardSchema = divineCardSchema.fork(["title", "image"], (s) => s.optional());

export const festivalCollectionSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Collection title is required",
    "string.min": "Title must be at least 2 characters",
  }),
  subtitle: Joi.string().trim().max(200).allow("").optional(),
  description: Joi.string().trim().max(500).allow("").optional(),
  image: Joi.string().trim().uri({ allowRelative: true }).required().messages({
    "string.empty": "Collection image URL/path is required",
  }),
  badgeText: Joi.string().trim().max(50).allow("").optional(),
  discountText: Joi.string().trim().max(50).allow("").optional(),
  link: Joi.string().trim().allow("").optional(),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

export const updateFestivalCollectionSchema = festivalCollectionSchema.fork(["title", "image"], (s) => s.optional());

