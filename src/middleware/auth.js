import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { unauthorized, forbidden, accountDeactivated } from "../utils/apiResponse.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Authentication required. Please provide a valid Bearer token.");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "sonic_super_secret_jwt_key_change_in_production_2026";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return unauthorized(res, "User session expired or user no longer exists.");
    }

    if (user.isActive === false) {
      return accountDeactivated(res, "Your account has been deactivated. Please contact support.");
    }

    req.user = user;
    next();
  } catch (error) {
    return unauthorized(res, "Invalid or expired token.", error.message);
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const secret = process.env.JWT_SECRET || "sonic_super_secret_jwt_key_change_in_production_2026";
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id);
      if (user && user.isActive !== false) {
        req.user = user;
      }
    }
  } catch {
    // Ignore error in optional auth
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, "Authentication required.");
  }
  if (req.user.role !== "admin") {
    return forbidden(res, "Access denied. Administrator privileges required.");
  }
  next();
};
