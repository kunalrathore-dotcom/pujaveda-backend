import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  restoreSubcategory,
} from "../controllers/categoryController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  categoryIdParamSchema,
  subcategoryIdParamSchema,
} from "../validations/categoryValidation.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", validate(categoryIdParamSchema, "params"), getCategoryById);

router.post("/", authenticate, requireAdmin, validate(createCategorySchema), createCategory);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema),
  updateCategory
);
router.put(
  "/:id/restore",
  authenticate,
  requireAdmin,
  validate(categoryIdParamSchema, "params"),
  restoreCategory
);
router.delete("/:id", authenticate, requireAdmin, validate(categoryIdParamSchema, "params"), deleteCategory);

router.post(
  "/:id/subcategories",
  authenticate,
  requireAdmin,
  validate(categoryIdParamSchema, "params"),
  validate(createSubcategorySchema),
  createSubcategory
);
router.put(
  "/:id/subcategories/:subcategoryId",
  authenticate,
  requireAdmin,
  validate(subcategoryIdParamSchema, "params"),
  validate(updateSubcategorySchema),
  updateSubcategory
);
router.put(
  "/:id/subcategories/:subcategoryId/restore",
  authenticate,
  requireAdmin,
  validate(subcategoryIdParamSchema, "params"),
  restoreSubcategory
);
router.delete(
  "/:id/subcategories/:subcategoryId",
  authenticate,
  requireAdmin,
  validate(subcategoryIdParamSchema, "params"),
  deleteSubcategory
);

export default router;

