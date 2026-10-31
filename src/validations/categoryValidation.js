import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Category name is required",
    "string.min": "Category name must be at least 2 characters",
    "string.max": "Category name cannot exceed 60 characters",
  }),
  image: Joi.string().trim().max(500).allow("").optional(),
  imageId: Joi.string().trim().max(200).allow("").optional(),
  isActive: Joi.boolean().default(true),
  order: Joi.number().integer().min(0).default(0),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional().messages({
    "string.empty": "Category name cannot be empty",
    "string.min": "Category name must be at least 2 characters",
    "string.max": "Category name cannot exceed 60 characters",
  }),
  image: Joi.string().trim().max(500).allow("").optional(),
  imageId: Joi.string().trim().max(200).allow("").optional(),
  isActive: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

export const createSubcategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().messages({
    "string.empty": "Subcategory name is required",
    "string.min": "Subcategory name must be at least 2 characters",
    "string.max": "Subcategory name cannot exceed 60 characters",
  }),
  isActive: Joi.boolean().default(true),
  order: Joi.number().integer().min(0).default(0),
});

export const updateSubcategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).optional().messages({
    "string.empty": "Subcategory name cannot be empty",
    "string.min": "Subcategory name must be at least 2 characters",
    "string.max": "Subcategory name cannot exceed 60 characters",
  }),
  isActive: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

export const categoryIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});

export const subcategoryIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
  subcategoryId: Joi.string().trim().required(),
});
