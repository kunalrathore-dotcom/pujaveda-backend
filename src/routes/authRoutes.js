import express from "express";
import {
  register,
  login,
  adminLogin,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  adminForgotPassword,
  adminVerifyResetOtp,
  adminResetPassword,
} from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../validations/authValidation.js";

const router = express.Router();

// Public Authentication
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/admin-login", validate(adminLoginSchema), adminLogin);
router.post("/admin/login", validate(adminLoginSchema), adminLogin);

// Customer Password Reset Flow
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-reset-otp", validate(verifyResetOtpSchema), verifyResetOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Admin Password Reset Flow (supports both hyphen and slash conventions)
router.post("/admin-forgot-password", validate(forgotPasswordSchema), adminForgotPassword);
router.post("/admin/forgot-password", validate(forgotPasswordSchema), adminForgotPassword);

router.post("/admin-verify-reset-otp", validate(verifyResetOtpSchema), adminVerifyResetOtp);
router.post("/admin/verify-reset-otp", validate(verifyResetOtpSchema), adminVerifyResetOtp);

router.post("/admin-reset-password", validate(resetPasswordSchema), adminResetPassword);
router.post("/admin/reset-password", validate(resetPasswordSchema), adminResetPassword);

// Protected User Profile
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, validate(updateProfileSchema), updateProfile);
router.put("/change-password", authenticate, validate(changePasswordSchema), changePassword);

export default router;
