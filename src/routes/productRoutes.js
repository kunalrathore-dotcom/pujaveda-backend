import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  bulkDeleteProducts,
  bulkRestoreProducts,
} from "../controllers/productController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productIdParamSchema,
} from "../validations/productValidation.js";

const router = express.Router();

router.get("/", validate(productQuerySchema, "query"), getProducts);
router.get("/:id", validate(productIdParamSchema, "params"), getProductById);

router.post("/", authenticate, requireAdmin, validate(createProductSchema), createProduct);
router.post("/bulk-trash", authenticate, requireAdmin, bulkDeleteProducts);
router.post("/bulk-restore", authenticate, requireAdmin, bulkRestoreProducts);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  updateProduct
);
router.put("/:id/restore", authenticate, requireAdmin, validate(productIdParamSchema, "params"), restoreProduct);
router.delete("/:id", authenticate, requireAdmin, validate(productIdParamSchema, "params"), deleteProduct);

export default router;

