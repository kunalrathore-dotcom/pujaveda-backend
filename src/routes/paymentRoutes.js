import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
} from "../controllers/paymentController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from "../validations/paymentValidation.js";

const router = express.Router();

// Webhook endpoint (must receive raw body or parsed body; signature verified in controller)
router.post("/webhook", handlePaymentWebhook);

// Protected payment endpoints
router.post(
  "/create-order",
  authenticate,
  validate(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  "/verify",
  authenticate,
  validate(verifyPaymentSchema),
  verifyPayment
);

export default router;

