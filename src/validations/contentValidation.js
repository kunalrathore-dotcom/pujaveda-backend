import Joi from "joi";

export const divineCardSchema = Joi.object({
  title: Joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Card title is required",
    "string.min": "Title must be at least 2 characters",
    "string.max": "Title cannot exceed 60 characters",
  }),
  pretitle: Joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Pretitle is required",
    "string.min": "Pretitle must be at least 2 characters",
    "string.max": "Pretitle cannot exceed 60 characters",
  }),
  subtitle: Joi.string().trim().max(60).allow("").optional(),
  description: Joi.string().trim().min(5).max(300).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 5 characters",
    "string.max": "Description cannot exceed 300 characters",
  }),
  image: Joi.string().trim().uri({ allowRelative: true }).optional().allow(""),
  imageUrl: Joi.string().trim().optional().allow(""),
  imageId: Joi.string().trim().allow("").optional(),
  ctaText: Joi.string().trim().max(30).default("Explore Essentials"),
  link: Joi.string().trim().max(250).required().messages({
    "string.empty": "Link URL is required",
    "string.max": "Link cannot exceed 250 characters",
  }),
  placement: Joi.string().valid("all", "homepage", "category").default("all"),
  categorySlug: Joi.string().trim().allow("").optional(),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

export const updateDivineCardSchema = divineCardSchema.fork(["title", "pretitle", "description", "link"], (s) => s.optional());

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

