import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  accountDeactivated,
  serverError,
} from "../utils/apiResponse.js";
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  consumeResetToken,
} from "../utils/passwordResetUtility.js";
import { sendEmail } from "../services/emailService.js";
import { getPasswordResetOtpEmail } from "../utils/emailTemplates.js";
import { auditService } from "../services/auditService.js";

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || "sonic_super_secret_jwt_key_change_in_production_2026";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    secret,
    { expiresIn }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return badRequest(res, "An account with this email address already exists.");
    }

    // Always force user role for public registration
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone: phone || "",
      role: "user",
      isActive: true,
    });

    // Initialize cart and wishlist records for new user
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, products: [] });

    const token = generateToken(user);

    await auditService.log({
      req,
      user,
      eventType: "USER_REGISTERED",
      category: "auth",
      description: `New user registered: ${user.name} (${user.email})`,
      entityType: "User",
      entityId: user._id,
      metadata: { email: user.email, name: user.name },
    });

    return created(res, "Registration successful.", {
      token,
      user,
    });
  } catch (error) {
    console.error("[AuthController] Register error:", error);
    return serverError(res, "Registration failed. Please try again.");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      await auditService.log({
        req,
        eventType: "USER_LOGIN_FAILED",
        category: "auth",
        description: `Failed login attempt for unknown email: ${normalizedEmail}`,
        metadata: { email: normalizedEmail },
      });
      return unauthorized(res, "Invalid email or password.");
    }

    if (user.role === "admin") {
      return forbidden(
        res,
        "Administrator accounts must sign in using the Sonic Admin Dashboard."
      );
    }

    if (user.isActive === false) {
      return accountDeactivated(res);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await auditService.log({
        req,
        user,
        eventType: "USER_LOGIN_FAILED",
        category: "auth",
        description: `Failed login attempt (incorrect password) for email: ${normalizedEmail}`,
        entityType: "User",
        entityId: user._id,
        metadata: { email: normalizedEmail },
      });
      return unauthorized(res, "Invalid email or password.");
    }

    const token = generateToken(user);

    await auditService.log({
      req,
      user,
      eventType: "USER_LOGGED_IN",
      category: "auth",
      description: `User signed in successfully: ${user.name} (${user.email})`,
      entityType: "User",
      entityId: user._id,
    });

    return ok(res, "Sign in successful.", {
      token,
      user,
    });
  } catch (error) {
    console.error("[AuthController] Login error:", error);
    return serverError(res, "Sign in failed. Please try again.");
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role !== "admin") {
      await auditService.log({
        req,
        eventType: "ADMIN_LOGIN_FAILED",
        category: "auth",
        description: `Failed admin login attempt for email: ${normalizedEmail}`,
        metadata: { email: normalizedEmail },
      });
      return forbidden(res, "Invalid admin credentials or unauthorized account.");
    }

    if (user.isActive === false) {
      return accountDeactivated(res);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await auditService.log({
        req,
        user,
        eventType: "ADMIN_LOGIN_FAILED",
        category: "auth",
        description: `Failed admin login attempt (wrong password) for: ${normalizedEmail}`,
        entityType: "User",
        entityId: user._id,
        metadata: { email: normalizedEmail },
      });
      return unauthorized(res, "Invalid email or password.");
    }

    const token = generateToken(user);

    await auditService.log({
      req,
      user,
      eventType: "ADMIN_LOGGED_IN",
      category: "auth",
      description: `Administrator signed in: ${user.name} (${user.email})`,
      entityType: "User",
      entityId: user._id,
    });

    return ok(res, "Admin authentication successful.", {
      token,
      user,
    });
  } catch (error) {
    console.error("[AuthController] Admin login error:", error);
    return serverError(res, "Admin authentication failed. Please try again.");
  }
};

export const getMe = async (req, res) => {
  return ok(res, "Account profile retrieved.", { user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (addresses !== undefined) user.addresses = addresses;

    await user.save();

    await auditService.log({
      req,
      user,
      eventType: "PROFILE_UPDATED",
      category: "account",
      description: `User ${user.name} updated profile details`,
      entityType: "User",
      entityId: user._id,
    });

    return ok(res, "Profile updated successfully.", { user });
  } catch (error) {
    console.error("[AuthController] Update profile error:", error);
    return serverError(res, "Failed to update profile.");
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return badRequest(res, "Current password does not match.");
    }

    user.password = newPassword;
    await user.save();

    await auditService.log({
      req,
      user,
      eventType: "PASSWORD_CHANGED",
      category: "account",
      description: `User ${user.name} changed account password`,
      entityType: "User",
      entityId: user._id,
    });

    return ok(res, "Password changed successfully.");
  } catch (error) {
    console.error("[AuthController] Change password error:", error);
    return serverError(res, "Failed to change password.");
  }
};

// ==========================================
// PASSWORD RESET CONTROLLERS (USER & ADMIN)
// ==========================================

const handleForgotPassword = async (req, res, targetRole = "user") => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Consistent message to prevent account enumeration
  const genericSuccessMessage =
    "If an account is associated with this email, a 6-digit verification code has been sent.";

  try {
    const user = await User.findOne({ email: normalizedEmail, role: targetRole });

    if (!user) {
      return ok(res, genericSuccessMessage);
    }

    if (user.isActive === false) {
      return accountDeactivated(res);
    }

    const otp = generateOtp();

    // Store in Redis with TTL and cooldown
    await storeOtp({ role: targetRole, email: normalizedEmail, otp });

    // Send email using Brevo SMTP
    try {
      const emailContent = getPasswordResetOtpEmail({
        name: user.name,
        otp,
        role: targetRole,
        expiryMinutes: 10,
      });

      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (emailErr) {
      console.error("[AuthController] Failed to send OTP email via SMTP:", emailErr.message);

      // In development mode, provide a helper log so testing can proceed if Brevo restricts current IP
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV NOTICE] Password reset OTP for ${normalizedEmail}: ${otp}`);
      }

      // If SMTP authentication/IP failed, inform user honestly
      return res.status(500).json({
        success: false,
        message:
          "Unable to deliver OTP email at this time. Please check SMTP configuration or try again shortly.",
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    }

    await auditService.log({
      req,
      user,
      eventType: "PASSWORD_RESET_REQUESTED",
      category: "auth",
      description: `Password reset OTP requested for ${normalizedEmail} (${targetRole})`,
      entityType: "User",
      entityId: user._id,
      metadata: { email: normalizedEmail, role: targetRole },
    });

    return ok(res, genericSuccessMessage);
  } catch (err) {
    console.error("[AuthController] Forgot password error:", err);
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    return serverError(res, "Failed to process forgot password request.");
  }
};

const handleVerifyResetOtp = async (req, res, targetRole = "user") => {
  const { email, otp } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const resetToken = await verifyOtp({
      role: targetRole,
      email: normalizedEmail,
      otp,
    });

    return ok(res, "OTP verified successfully.", { resetToken });
  } catch (err) {
    console.error("[AuthController] Verify OTP error:", err.message);
    const statusCode = err.status || 400;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

const handleResetPassword = async (req, res, targetRole = "user") => {
  const { email, resetToken, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const tokenData = await consumeResetToken({
      role: targetRole,
      resetToken,
    });

    if (tokenData.email !== normalizedEmail || tokenData.role !== targetRole) {
      return badRequest(res, "Reset token does not match the provided email address.");
    }

    const user = await User.findOne({ email: normalizedEmail, role: targetRole });
    if (!user) {
      return notFound(res, "User account not found.");
    }

    if (user.isActive === false) {
      return accountDeactivated(res);
    }

    user.password = password;
    await user.save();

    await auditService.log({
      req,
      user,
      eventType: "PASSWORD_RESET_COMPLETED",
      category: "auth",
      description: `Password reset successfully completed for ${normalizedEmail} (${targetRole})`,
      entityType: "User",
      entityId: user._id,
      metadata: { email: normalizedEmail, role: targetRole },
    });

    return ok(res, "Password reset successfully. You can now sign in with your new password.");
  } catch (err) {
    console.error("[AuthController] Reset password error:", err.message);
    const statusCode = err.status || 400;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

// User Endpoints
export const forgotPassword = (req, res) => handleForgotPassword(req, res, "user");
export const verifyResetOtp = (req, res) => handleVerifyResetOtp(req, res, "user");
export const resetPassword = (req, res) => handleResetPassword(req, res, "user");

// Admin Endpoints
export const adminForgotPassword = (req, res) => handleForgotPassword(req, res, "admin");
export const adminVerifyResetOtp = (req, res) => handleVerifyResetOtp(req, res, "admin");
export const adminResetPassword = (req, res) => handleResetPassword(req, res, "admin");
