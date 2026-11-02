import Joi from "joi";

export const createBannerSchema = Joi.object({
  title: Joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Banner title is required",
    "string.min": "Banner title must be at least 2 characters",
    "string.max": "Banner title cannot exceed 60 characters",
  }),
  subtitle: Joi.string().trim().min(2).max(160).required().messages({
    "string.empty": "Banner description is required",
    "string.min": "Banner description must be at least 2 characters",
    "string.max": "Banner description cannot exceed 160 characters",
  }),
  imageUrl: Joi.string().trim().required().messages({
    "string.empty": "Desktop banner image is required",
  }),
  imageId: Joi.string().trim().allow("").optional(),
  mobileImageUrl: Joi.string().trim().allow("").optional(),
  mobileImageId: Joi.string().trim().allow("").optional(),
  ctaText: Joi.string().trim().max(30).default("Explore Collection"),
  link: Joi.string().trim().max(250).default("/category/puja-items"),
  active: Joi.boolean().default(true),
  order: Joi.number().integer().min(0).default(0),
});

export const updateBannerSchema = Joi.object({
  title: Joi.string().trim().min(2).max(60).optional().messages({
    "string.max": "Banner title cannot exceed 60 characters",
  }),
  subtitle: Joi.string().trim().min(2).max(160).optional().messages({
    "string.max": "Banner description cannot exceed 160 characters",
  }),
  imageUrl: Joi.string().trim().optional(),
  imageId: Joi.string().trim().allow("").optional(),
  mobileImageUrl: Joi.string().trim().allow("").optional(),
  mobileImageId: Joi.string().trim().allow("").optional(),
  ctaText: Joi.string().trim().max(30).optional(),
  link: Joi.string().trim().max(250).optional(),
  active: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

export const bannerIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});
