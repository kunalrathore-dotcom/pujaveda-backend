import { BlogCategory } from "../models/BlogCategory.js";
import { Blog } from "../models/Blog.js";
import {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from "../utils/apiResponse.js";

/**
 * Get Public Categories with published article counts
 */
export const getPublicCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isDeleted: { $ne: true } })
      .sort({ order: 1, name: 1 })
      .lean();

    // Aggregate published articles count
    const counts = await Blog.aggregate([
      {
        $match: {
          status: "published",
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      articleCount: countMap[cat.name] || 0,
      count: countMap[cat.name] || 0,
    }));

    return ok(res, "Categories fetched successfully.", {
      categories: categoriesWithCount,
    });
  } catch (error) {
    console.error("[BlogCategoryController] getPublicCategories error:", error);
    return serverError(res, "Failed to fetch categories.", error.message);
  }
};

/**
 * Get Admin Categories with active article counts
 */
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isDeleted: { $ne: true } })
      .sort({ order: 1, name: 1 })
      .lean();

    // Aggregate active articles count (all statuses)
    const counts = await Blog.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c;
    });

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      articleCount: countMap[cat.name]?.total || 0,
      publishedCount: countMap[cat.name]?.published || 0,
    }));

    return ok(res, "Categories fetched successfully.", {
      categories: categoriesWithCount,
    });
  } catch (error) {
    console.error("[BlogCategoryController] getAdminCategories error:", error);
    return serverError(res, "Failed to fetch categories.", error.message);
  }
};

/**
 * Create a new Blog Category (Admin)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, slug, description, order } = req.body;
    const normalizedSlug = slug.toLowerCase().trim();
    const trimmedName = name.trim();

    // 1. Check slug uniqueness among active categories
    const existingSlug = await BlogCategory.findOne({
      slug: normalizedSlug,
      isDeleted: { $ne: true },
    }).lean();

    if (existingSlug) {
      return badRequest(res, "A category with this slug already exists.", {
        field: "slug",
      });
    }

    // 2. Check name uniqueness among active categories (case-insensitive)
    const existingName = await BlogCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      isDeleted: { $ne: true },
    }).lean();

    if (existingName) {
      return badRequest(res, "A category with this name already exists.", {
        field: "name",
      });
    }

    const category = await BlogCategory.create({
      name: trimmedName,
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      order: typeof order === "number" ? order : 0,
      isDeleted: false,
    });

    return created(res, "Category created successfully.", { category });
  } catch (error) {
    console.error("[BlogCategoryController] createCategory error:", error);
    return serverError(res, "Failed to create category.", error.message);
  }
};

/**
 * Update a Blog Category (Admin)
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, order } = req.body;

    const category = await BlogCategory.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return notFound(res, "Category not found.");
    }

    const oldName = category.name;

    // Check slug uniqueness if changed
    if (slug) {
      const normalizedSlug = slug.toLowerCase().trim();
      if (normalizedSlug !== category.slug) {
        const existingSlug = await BlogCategory.findOne({
          _id: { $ne: id },
          slug: normalizedSlug,
          isDeleted: { $ne: true },
        }).lean();

        if (existingSlug) {
          return badRequest(res, "A category with this slug already exists.", {
            field: "slug",
          });
        }
        category.slug = normalizedSlug;
      }
    }

    // Check name uniqueness if changed
    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== category.name.toLowerCase()) {
        const existingName = await BlogCategory.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
          isDeleted: { $ne: true },
        }).lean();

        if (existingName) {
          return badRequest(res, "A category with this name already exists.", {
            field: "name",
          });
        }
      }
      category.name = trimmedName;
    }

    if (description !== undefined) {
      category.description = description ? description.trim() : "";
    }

    if (typeof order === "number") {
      category.order = order;
    }

    await category.save();

    // If name changed, synchronize existing articles that used the old name
    if (name && category.name !== oldName) {
      await Blog.updateMany(
        { category: oldName },
        { $set: { category: category.name, categoryId: category._id } }
      );
    }

    return ok(res, "Category updated successfully.", { category });
  } catch (error) {
    console.error("[BlogCategoryController] updateCategory error:", error);
    return serverError(res, "Failed to update category.", error.message);
  }
};

/**
 * Delete a Blog Category (Admin - Soft Delete with safety check)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BlogCategory.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return notFound(res, "Category not found.");
    }

    // Check if category has active articles
    const articleCount = await Blog.countDocuments({
      $or: [{ categoryId: id }, { category: category.name }],
      isDeleted: { $ne: true },
    });

    if (articleCount > 0) {
      return badRequest(
        res,
        `Cannot delete category "${category.name}" because it contains ${articleCount} article(s). Please reassign or delete these articles first.`,
        { articleCount, categoryName: category.name }
      );
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    return ok(res, "Category deleted successfully.", {
      id: category._id,
      name: category.name,
    });
  } catch (error) {
    console.error("[BlogCategoryController] deleteCategory error:", error);
    return serverError(res, "Failed to delete category.", error.message);
  }
};

