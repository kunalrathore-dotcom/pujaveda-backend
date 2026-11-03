import express from "express";
import {
  createArticle,
  getAdminArticles,
  getArticleById,
  updateArticle,
  updateArticleStatus,
  deleteArticle,
  getPublicArticles,
  getPublicArticleBySlug,
} from "../controllers/blogController.js";
import {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/blogCategoryController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createBlogSchema,
  updateBlogSchema,
  statusBlogSchema,
  blogQuerySchema,
  createBlogCategorySchema,
  updateBlogCategorySchema,
} from "../validations/blogValidation.js";

const publicRouter = express.Router();
const adminRouter = express.Router();

/**
 * Public Routes (Mounted at /api/blog)
 */
publicRouter.get("/categories", getPublicCategories);
publicRouter.get("/", validate(blogQuerySchema, "query"), getPublicArticles);
publicRouter.get("/:slug", getPublicArticleBySlug);

/**
 * Admin Protected Routes (Mounted at /api/admin/blog)
 */
adminRouter.use(authenticate, requireAdmin);

// Category Management Routes (Must be declared before /:id routes)
adminRouter.get("/categories", getAdminCategories);
adminRouter.post("/categories", validate(createBlogCategorySchema), createCategory);
adminRouter.put("/categories/:id", validate(updateBlogCategorySchema), updateCategory);
adminRouter.delete("/categories/:id", deleteCategory);

// Article Management Routes
adminRouter.post("/", validate(createBlogSchema), createArticle);
adminRouter.get("/", validate(blogQuerySchema, "query"), getAdminArticles);
adminRouter.get("/:id", getArticleById);
adminRouter.put("/:id", validate(updateBlogSchema), updateArticle);
adminRouter.patch("/:id/status", validate(statusBlogSchema), updateArticleStatus);
adminRouter.delete("/:id", deleteArticle);

export { publicRouter as blogPublicRoutes, adminRouter as blogAdminRoutes };
export default publicRouter;
