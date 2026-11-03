import Joi from "joi";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBlogCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).required().messages({
    "string.base": "Category name must be a valid text string.",
    "string.empty": "Category name is required.",
    "string.min": "Category name must be at least 2 characters.",
    "string.max": "Category name cannot exceed 40 characters.",
    "any.required": "Category name is required.",
  }),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(60)
    .pattern(slugRegex)
    .required()
    .messages({
      "string.base": "Slug must be a valid text string.",
      "string.empty": "Slug is required.",
      "string.min": "Slug must be at least 2 characters.",
      "string.max": "Slug cannot exceed 60 characters.",
      "string.pattern.base":
        "Slug must consist of lowercase letters, numbers, and single hyphens without special characters or spaces.",
      "any.required": "Slug is required.",
    }),

  description: Joi.string().trim().max(150).allow("").optional().messages({
    "string.max": "Description cannot exceed 150 characters.",
  }),

  order: Joi.number().integer().min(0).default(0).optional(),
});

export const updateBlogCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).optional().messages({
    "string.base": "Category name must be a valid text string.",
    "string.empty": "Category name cannot be empty.",
    "string.min": "Category name must be at least 2 characters.",
    "string.max": "Category name cannot exceed 40 characters.",
  }),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(60)
    .pattern(slugRegex)
    .optional()
    .messages({
      "string.base": "Slug must be a valid text string.",
      "string.empty": "Slug cannot be empty.",
      "string.min": "Slug must be at least 2 characters.",
      "string.max": "Slug cannot exceed 60 characters.",
      "string.pattern.base":
        "Slug must consist of lowercase letters, numbers, and single hyphens without special characters or spaces.",
    }),

  description: Joi.string().trim().max(150).allow("").optional().messages({
    "string.max": "Description cannot exceed 150 characters.",
  }),

  order: Joi.number().integer().min(0).optional(),
});

export const createBlogSchema = Joi.object({
  title: Joi.string().trim().min(2).max(80).required().messages({
    "string.base": "Article title must be a valid text string.",
    "string.empty": "Article title is required.",
    "string.min": "Article title must be at least 2 characters.",
    "string.max": "Article title cannot exceed 80 characters.",
    "any.required": "Article title is required.",
  }),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(100)
    .pattern(slugRegex)
    .required()
    .messages({
      "string.base": "Slug must be a valid text string.",
      "string.empty": "Slug is required.",
      "string.min": "Slug must be at least 2 characters.",
      "string.max": "Slug cannot exceed 100 characters.",
      "string.pattern.base":
        "Slug must consist of lowercase letters, numbers, and single hyphens without special characters or spaces.",
      "any.required": "Slug is required.",
    }),

  category: Joi.string().trim().min(2).max(40).required().messages({
    "string.base": "Category must be a valid text string.",
    "string.empty": "Please select or enter a category.",
    "string.min": "Category must be at least 2 characters.",
    "string.max": "Category cannot exceed 40 characters.",
    "any.required": "Category is required.",
  }),

  categoryId: Joi.string().trim().allow(null, "").optional(),

  shortDescription: Joi.string().trim().min(5).max(180).required().messages({
    "string.base": "Short description must be a valid text string.",
    "string.empty": "Short description is required.",
    "string.min": "Short description must be at least 5 characters.",
    "string.max": "Short description cannot exceed 180 characters.",
    "any.required": "Short description is required.",
  }),

  coverImage: Joi.string().trim().required().messages({
    "string.base": "Cover image URL or path must be a valid string.",
    "string.empty": "Cover image is required.",
    "any.required": "Cover image is required.",
  }),

  content: Joi.string().trim().min(10).max(20000).required().messages({
    "string.base": "Article content must be a valid text string.",
    "string.empty": "Article content is required.",
    "string.min": "Article content must be at least 10 characters.",
    "string.max": "Article content cannot exceed 20,000 characters.",
    "any.required": "Article content is required.",
  }),

  seoTitle: Joi.string().trim().max(70).allow("").optional().messages({
    "string.max": "SEO title cannot exceed 70 characters.",
  }),

  seoDescription: Joi.string().trim().max(160).allow("").optional().messages({
    "string.max": "SEO description cannot exceed 160 characters.",
  }),

  status: Joi.string().trim().valid("draft", "published").default("draft").messages({
    "any.only": "Status must be either 'draft' or 'published'.",
  }),

  author: Joi.string().trim().max(60).allow("").optional().messages({
    "string.max": "Author name cannot exceed 60 characters.",
  }),
});

export const updateBlogSchema = Joi.object({
  title: Joi.string().trim().min(2).max(80).optional().messages({
    "string.base": "Article title must be a valid text string.",
    "string.empty": "Article title cannot be empty.",
    "string.min": "Article title must be at least 2 characters.",
    "string.max": "Article title cannot exceed 80 characters.",
  }),

  slug: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(100)
    .pattern(slugRegex)
    .optional()
    .messages({
      "string.base": "Slug must be a valid text string.",
      "string.empty": "Slug cannot be empty.",
      "string.min": "Slug must be at least 2 characters.",
      "string.max": "Slug cannot exceed 100 characters.",
      "string.pattern.base":
        "Slug must consist of lowercase letters, numbers, and single hyphens without special characters or spaces.",
    }),

  category: Joi.string().trim().min(2).max(40).optional().messages({
    "string.empty": "Category cannot be empty.",
    "string.min": "Category must be at least 2 characters.",
    "string.max": "Category cannot exceed 40 characters.",
  }),

  categoryId: Joi.string().trim().allow(null, "").optional(),

  shortDescription: Joi.string().trim().min(5).max(180).optional().messages({
    "string.base": "Short description must be a valid text string.",
    "string.empty": "Short description cannot be empty.",
    "string.min": "Short description must be at least 5 characters.",
    "string.max": "Short description cannot exceed 180 characters.",
  }),

  coverImage: Joi.string().trim().optional().messages({
    "string.empty": "Cover image cannot be empty.",
  }),

  content: Joi.string().trim().min(10).max(20000).optional().messages({
    "string.base": "Article content must be a valid text string.",
    "string.empty": "Article content cannot be empty.",
    "string.min": "Article content must be at least 10 characters.",
    "string.max": "Article content cannot exceed 20,000 characters.",
  }),

  seoTitle: Joi.string().trim().max(70).allow("").optional().messages({
    "string.max": "SEO title cannot exceed 70 characters.",
  }),

  seoDescription: Joi.string().trim().max(160).allow("").optional().messages({
    "string.max": "SEO description cannot exceed 160 characters.",
  }),

  status: Joi.string().trim().valid("draft", "published").optional().messages({
    "any.only": "Status must be either 'draft' or 'published'.",
  }),

  author: Joi.string().trim().max(60).allow("").optional().messages({
    "string.max": "Author name cannot exceed 60 characters.",
  }),
});

export const statusBlogSchema = Joi.object({
  status: Joi.string().trim().valid("draft", "published").required().messages({
    "string.empty": "Status is required.",
    "any.only": "Status must be either 'draft' or 'published'.",
    "any.required": "Status is required.",
  }),
});

export const blogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).allow("").optional(),
  category: Joi.string().trim().max(60).allow("").optional(),
  status: Joi.string().trim().valid("all", "draft", "published").default("all"),
}).unknown(true);
