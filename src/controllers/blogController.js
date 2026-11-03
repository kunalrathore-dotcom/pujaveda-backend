import mongoose from "mongoose";
import { Blog } from "../models/Blog.js";
import { BLOG_CATEGORIES } from "../constants/blogCategories.js";
import { sanitizeArticleHtml } from "../utils/sanitizeHtml.js";
import {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from "../utils/apiResponse.js";

// Helper for escaping regex search terms safely
const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * ============================================================================
 * ADMIN CONTROLLERS
 * ============================================================================
 */

/**
 * Create a new Blog Article (Admin)
 */
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      slug,
      category,
      shortDescription,
      coverImage,
      content,
      seoTitle,
      seoDescription,
      status,
      author,
    } = req.body;

    const normalizedSlug = slug.toLowerCase().trim();

    // 1. Enforce slug uniqueness among active articles
    const existing = await Blog.findOne({
      slug: normalizedSlug,
      isDeleted: { $ne: true },
    }).lean();

    if (existing) {
      return badRequest(res, "Slug already exists. Please choose a unique slug.", {
        slug: "Slug already exists. Please enter a unique slug.",
      });
    }

    // 2. Sanitize HTML content
    const sanitizedContent = sanitizeArticleHtml(content);
    if (!sanitizedContent || sanitizedContent.length < 10) {
      return badRequest(res, "Article content must contain at least 10 valid characters.", {
        content: "Article content must contain at least 10 valid characters.",
      });
    }

    const articleStatus = status === "published" ? "published" : "draft";
    const publishedAt = articleStatus === "published" ? new Date() : null;

    const newArticle = new Blog({
      title: title.trim(),
      slug: normalizedSlug,
      category: category.trim(),
      shortDescription: shortDescription.trim(),
      coverImage: coverImage.trim(),
      content: sanitizedContent,
      seoTitle: (seoTitle || "").trim(),
      seoDescription: (seoDescription || "").trim(),
      status: articleStatus,
      publishedAt,
      author: (author || req.user?.name || "Pujaveda Editorial").trim(),
      authorUser: req.user?._id || null,
      isDeleted: false,
    });

    await newArticle.save();

    return created(res, "Blog article created successfully.", {
      article: newArticle,
    });
  } catch (error) {
    console.error("[BlogController] createArticle error:", error);
    return serverError(res, "Failed to create blog article.", error.message);
  }
};

/**
 * Get all articles with pagination, search, category, and status filter (Admin)
 */
export const getAdminArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      status = "all",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isDeleted: { $ne: true } };

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { shortDescription: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const [articles, total, totalPublished, totalDrafts] = await Promise.all([
      Blog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter),
      Blog.countDocuments({ isDeleted: { $ne: true }, status: "published" }),
      Blog.countDocuments({ isDeleted: { $ne: true }, status: "draft" }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return ok(res, "Articles fetched successfully.", {
      articles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      summary: {
        total,
        totalPublished,
        totalDrafts,
      },
    });
  } catch (error) {
    console.error("[BlogController] getAdminArticles error:", error);
    return serverError(res, "Failed to fetch articles.", error.message);
  }
};

/**
 * Get single article by ID (Admin)
 */
export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, "Invalid article ID format.");
    }

    const article = await Blog.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).lean();

    if (!article) {
      return notFound(res, "Article not found.");
    }

    return ok(res, "Article fetched successfully.", { article });
  } catch (error) {
    console.error("[BlogController] getArticleById error:", error);
    return serverError(res, "Failed to fetch article.", error.message);
  }
};

/**
 * Update an existing article (Admin)
 */
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, "Invalid article ID format.");
    }

    const article = await Blog.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return notFound(res, "Article not found.");
    }

    const {
      title,
      slug,
      category,
      shortDescription,
      coverImage,
      content,
      seoTitle,
      seoDescription,
      status,
      author,
    } = req.body;

    // If slug is modified, verify uniqueness
    if (slug) {
      const normalizedSlug = slug.toLowerCase().trim();
      if (normalizedSlug !== article.slug) {
        const existing = await Blog.findOne({
          _id: { $ne: id },
          slug: normalizedSlug,
          isDeleted: { $ne: true },
        }).lean();

        if (existing) {
          return badRequest(res, "Slug already exists. Please choose a unique slug.", {
            slug: "Slug already exists. Please enter a unique slug.",
          });
        }
        article.slug = normalizedSlug;
      }
    }

    if (title !== undefined) article.title = title.trim();
    if (category !== undefined) article.category = category.trim();
    if (shortDescription !== undefined) article.shortDescription = shortDescription.trim();
    if (coverImage !== undefined) article.coverImage = coverImage.trim();
    if (seoTitle !== undefined) article.seoTitle = (seoTitle || "").trim();
    if (seoDescription !== undefined) article.seoDescription = (seoDescription || "").trim();
    if (author !== undefined) article.author = (author || "Pujaveda Editorial").trim();

    if (content !== undefined) {
      const sanitized = sanitizeArticleHtml(content);
      if (!sanitized || sanitized.length < 10) {
        return badRequest(res, "Article content must contain at least 10 valid characters.", {
          content: "Article content must contain at least 10 valid characters.",
        });
      }
      article.content = sanitized;
    }

    if (status !== undefined) {
      if (status === "published" && article.status !== "published") {
        article.status = "published";
        article.publishedAt = article.publishedAt || new Date();
      } else if (status === "draft") {
        article.status = "draft";
      }
    }

    await article.save();

    return ok(res, "Blog article updated successfully.", { article });
  } catch (error) {
    console.error("[BlogController] updateArticle error:", error);
    return serverError(res, "Failed to update article.", error.message);
  }
};

/**
 * Patch article status (Publish / Unpublish) (Admin)
 */
export const updateArticleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, "Invalid article ID format.");
    }

    const article = await Blog.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return notFound(res, "Article not found.");
    }

    article.status = status;
    if (status === "published") {
      article.publishedAt = article.publishedAt || new Date();
    }

    await article.save();

    return ok(
      res,
      `Article ${status === "published" ? "published" : "moved to draft"} successfully.`,
      { article }
    );
  } catch (error) {
    console.error("[BlogController] updateArticleStatus error:", error);
    return serverError(res, "Failed to update article status.", error.message);
  }
};

/**
 * Soft delete an article (Admin)
 */
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, "Invalid article ID format.");
    }

    const article = await Blog.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!article) {
      return notFound(res, "Article not found.");
    }

    article.isDeleted = true;
    article.deletedAt = new Date();
    await article.save();

    return ok(res, "Article deleted successfully.");
  } catch (error) {
    console.error("[BlogController] deleteArticle error:", error);
    return serverError(res, "Failed to delete article.", error.message);
  }
};

/**
 * ============================================================================
 * PUBLIC CONTROLLERS (CUSTOMER FRONTEND)
 * ============================================================================
 */

/**
 * Get published articles (Public)
 */
export const getPublicArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 9,
      search = "",
      category = "",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 9, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      status: "published",
      isDeleted: { $ne: true },
    };

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { shortDescription: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    const [articles, total] = await Promise.all([
      Blog.find(filter)
        .select("title slug category shortDescription coverImage publishedAt createdAt author")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return ok(res, "Articles fetched successfully.", {
      articles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("[BlogController] getPublicArticles error:", error);
    return serverError(res, "Failed to fetch published articles.", error.message);
  }
};

/**
 * Get single published article by slug with related articles (Public)
 */
export const getPublicArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      return badRequest(res, "Slug parameter is required.");
    }

    const article = await Blog.findOne({
      slug: slug.toLowerCase().trim(),
      status: "published",
      isDeleted: { $ne: true },
    }).lean();

    if (!article) {
      return notFound(res, "Article not found or not published.");
    }

    // Fetch up to 3 related published articles from same category
    const relatedArticles = await Blog.find({
      category: article.category,
      _id: { $ne: article._id },
      status: "published",
      isDeleted: { $ne: true },
    })
      .select("title slug category shortDescription coverImage publishedAt")
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return ok(res, "Article fetched successfully.", {
      article,
      relatedArticles,
    });
  } catch (error) {
    console.error("[BlogController] getPublicArticleBySlug error:", error);
    return serverError(res, "Failed to fetch article details.", error.message);
  }
};

/**
 * Get Blog Categories with counts of published articles (Public)
 */
export const getBlogCategories = async (req, res) => {
  try {
    // Aggregate counts for approved categories
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

    const categoryList = BLOG_CATEGORIES.map((cat) => ({
      name: cat,
      count: countMap[cat] || 0,
    }));

    return ok(res, "Categories fetched successfully.", {
      categories: categoryList,
    });
  } catch (error) {
    console.error("[BlogController] getBlogCategories error:", error);
    return serverError(res, "Failed to fetch categories.", error.message);
  }
};

