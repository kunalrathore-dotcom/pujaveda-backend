import express from "express";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  restoreCoupon,
  toggleCouponStatus,
  getCouponUsages,
  validateCoupon,
  getCartCouponOffers,
} from "../controllers/couponController.js";
import { authenticate, optionalAuthenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponOffersSchema,
} from "../validations/couponValidation.js";

const router = express.Router();

// User routes for product-wise coupon offers and single-code application
router.post("/offers", optionalAuthenticate, validate(couponOffersSchema), getCartCouponOffers);
router.post("/apply", optionalAuthenticate, validate(validateCouponSchema), validateCoupon);

// Admin Coupon Management routes
router.get("/", authenticate, requireAdmin, getCoupons);
router.post("/", authenticate, requireAdmin, validate(createCouponSchema), createCoupon);
router.get("/:id/usages", authenticate, requireAdmin, getCouponUsages);
router.put("/:id", authenticate, requireAdmin, validate(updateCouponSchema), updateCoupon);
router.patch("/:id/status", authenticate, requireAdmin, toggleCouponStatus);
router.put("/:id/restore", authenticate, requireAdmin, restoreCoupon);
router.delete("/:id", authenticate, requireAdmin, deleteCoupon);

export default router;

