import express from "express";
import {
  createOrder,
  quoteOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
} from "../controllers/orderController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
} from "../validations/orderValidation.js";
import { verifyPaymentSchema } from "../validations/paymentValidation.js";

const router = express.Router();

router.use(authenticate);

router.post("/quote", quoteOrder);
router.post("/", validate(createOrderSchema), createOrder);
router.get("/my-orders", getMyOrders);
router.post("/verify-payment", validate(verifyPaymentSchema), verifyPayment);
router.get("/:id", validate(orderIdParamSchema, "params"), getOrderById);

// Admin Order Management
router.get("/", requireAdmin, getAllOrders);
router.put(
  "/:id/status",
  requireAdmin,
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;

