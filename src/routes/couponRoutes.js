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

const router = express.Router();

// User routes for product-wise coupon offers and single-code application
router.post("/offers", optionalAuthenticate, getCartCouponOffers);
router.post("/apply", optionalAuthenticate, validateCoupon);

// Admin Coupon Management routes
router.get("/", authenticate, requireAdmin, getCoupons);
router.post("/", authenticate, requireAdmin, createCoupon);
router.get("/:id/usages", authenticate, requireAdmin, getCouponUsages);
router.put("/:id", authenticate, requireAdmin, updateCoupon);
router.patch("/:id/status", authenticate, requireAdmin, toggleCouponStatus);
router.put("/:id/restore", authenticate, requireAdmin, restoreCoupon);
router.delete("/:id", authenticate, requireAdmin, deleteCoupon);

export default router;

