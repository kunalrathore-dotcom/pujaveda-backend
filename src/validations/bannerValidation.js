import Joi from "joi";

export const createBannerSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Banner title is required",
    "string.min": "Banner title must be at least 2 characters",
    "string.max": "Banner title cannot exceed 120 characters",
  }),
  subtitle: Joi.string().trim().max(300).allow("").optional(),
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
  title: Joi.string().trim().min(2).max(120).optional(),
  subtitle: Joi.string().trim().max(300).allow("").optional(),
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
