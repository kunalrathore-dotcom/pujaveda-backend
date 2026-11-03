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
  getBlogCategories,
} from "../controllers/blogController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createBlogSchema,
  updateBlogSchema,
  statusBlogSchema,
  blogQuerySchema,
} from "../validations/blogValidation.js";

const publicRouter = express.Router();
const adminRouter = express.Router();

/**
 * Public Routes (Mounted at /api/blog)
 */
publicRouter.get("/", validate(blogQuerySchema, "query"), getPublicArticles);
publicRouter.get("/categories", getBlogCategories);
publicRouter.get("/:slug", getPublicArticleBySlug);

/**
 * Admin Protected Routes (Mounted at /api/admin/blog)
 */
adminRouter.use(authenticate, requireAdmin);

adminRouter.post("/", validate(createBlogSchema), createArticle);
adminRouter.get("/", validate(blogQuerySchema, "query"), getAdminArticles);
adminRouter.get("/:id", getArticleById);
adminRouter.put("/:id", validate(updateBlogSchema), updateArticle);
adminRouter.patch("/:id/status", validate(statusBlogSchema), updateArticleStatus);
adminRouter.delete("/:id", deleteArticle);

export { publicRouter as blogPublicRoutes, adminRouter as blogAdminRoutes };
export default publicRouter;

