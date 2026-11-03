import Joi from "joi";

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 2 characters",
    "string.max": "Product name cannot exceed 80 characters",
  }),
  sku: Joi.string().trim().uppercase().max(50).allow("").optional(),
  categoryId: Joi.string().trim().required().messages({
    "string.empty": "Category ID or slug is required",
  }),
  subcategoryId: Joi.string().trim().required().messages({
    "string.empty": "Subcategory is required",
    "any.required": "Subcategory is required",
  }),
  subcategoryName: Joi.string().trim().allow("").optional(),
  price: Joi.number().min(0).required().messages({
    "number.base": "Selling price must be a valid number",
    "number.min": "Price cannot be negative",
    "any.required": "Price is required",
  }),
  originalPrice: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Stock must be an integer",
    "number.min": "Stock cannot be negative",
  }),
  badge: Joi.string().trim().max(30).allow("").optional(),

  // Multiple Images validation:
  // If published, minimum 5 images required (up to 8). Drafts allow fewer.
  isPublished: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  images: Joi.array()
    .items(Joi.string().trim())
    .when("isPublished", {
      is: true,
      then: Joi.array().min(5).max(8).required().messages({
        "array.min": "Every published product must have at least 5 images.",
        "array.max": "Maximum 8 images allowed per product.",
        "any.required": "Product images are required.",
      }),
      otherwise: Joi.array().min(0).max(8).optional(),
    }),
  imageIds: Joi.array().items(Joi.string().trim()).optional(),
  primaryImage: Joi.string().trim().allow("").optional(),

  // Descriptions
  shortDescription: Joi.string().trim().max(250).allow("").optional(),
  description: Joi.string().trim().max(3000).allow("").optional(),

  // Devotional Specifications
  material: Joi.string().trim().max(100).allow("").optional(),
  weight: Joi.string().trim().max(50).allow("").optional(),
  dimensions: Joi.string().trim().max(50).allow("").optional(),
  packContents: Joi.string().trim().max(250).allow("").optional(),
  origin: Joi.string().trim().max(100).allow("").optional(),
  idealFor: Joi.string().trim().max(250).allow("").optional(),
  careInstructions: Joi.string().trim().max(500).allow("").optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),

  specifications: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          label: Joi.string().trim().max(100).required(),
          value: Joi.string().trim().max(250).required(),
        })
      ),
      Joi.object()
    )
    .optional(),
  faqs: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().max(200).required(),
        answer: Joi.string().trim().max(1000).required(),
      })
    )
    .optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  sku: Joi.string().trim().uppercase().max(50).allow("").optional(),
  categoryId: Joi.string().trim().optional(),
  subcategoryId: Joi.string().trim().allow("").optional(),
  subcategoryName: Joi.string().trim().allow("").optional(),
  price: Joi.number().min(0).optional(),
  originalPrice: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  badge: Joi.string().trim().max(30).allow("").optional(),
  isPublished: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  images: Joi.array().items(Joi.string().trim()).max(8).optional(),
  imageIds: Joi.array().items(Joi.string().trim()).optional(),
  primaryImage: Joi.string().trim().allow("").optional(),
  shortDescription: Joi.string().trim().max(250).allow("").optional(),
  description: Joi.string().trim().max(3000).allow("").optional(),
  material: Joi.string().trim().max(100).allow("").optional(),
  weight: Joi.string().trim().max(50).allow("").optional(),
  dimensions: Joi.string().trim().max(50).allow("").optional(),
  packContents: Joi.string().trim().max(250).allow("").optional(),
  origin: Joi.string().trim().max(100).allow("").optional(),
  idealFor: Joi.string().trim().max(250).allow("").optional(),
  careInstructions: Joi.string().trim().max(500).allow("").optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  specifications: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          label: Joi.string().trim().max(100).required(),
          value: Joi.string().trim().max(250).required(),
        })
      ),
      Joi.object()
    )
    .optional(),
  faqs: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().max(200).required(),
        answer: Joi.string().trim().max(1000).required(),
      })
    )
    .optional(),
}).min(1);

export const productQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  categoryId: Joi.string().trim().allow("").optional(),
  subcategoryId: Joi.string().trim().allow("").optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  isPublished: Joi.string().valid("all", "true", "false").optional(),
  isFeatured: Joi.string().valid("all", "true", "false").optional(),
  isDeleted: Joi.string().valid("all", "true", "false").optional(),
  sortBy: Joi.string()
    .valid("featured", "price-low", "price-high", "rating", "newest")
    .default("featured"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const productIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});
