import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Wishlist } from "../models/Wishlist.js";
import { storageService } from "../services/storageService.js";
import { auditService } from "../services/auditService.js";

/**
 * GET /api/user/profile
 * Retrieves the authenticated customer's own profile, saved addresses, and activity statistics.
 * Strictly uses req.user._id from the authentication token.
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const [totalOrders, wishlistDoc] = await Promise.all([
      Order.countDocuments({ user: user._id }),
      Wishlist.findOne({ user: user._id }).select("products").lean(),
    ]);

    return res.json({
      success: true,
      message: "Customer profile retrieved.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        avatar: user.avatar || "",
        role: user.role,
        isActive: user.isActive,
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        totalOrders,
        wishlistCount: wishlistDoc?.products?.length || 0,
      },
    });
  } catch (error) {
    console.error("[UserController] getProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve profile.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/user/profile
 * Updates the authenticated customer's personal details and addresses.
 * Protected fields (role, password, email, isActive) cannot be modified here.
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const { name, phone, addresses } = req.body;

    if (name !== undefined) {
      user.name = String(name).trim();
    }
    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }
    if (addresses !== undefined && Array.isArray(addresses)) {
      if (addresses.length > 3) {
        return res.status(400).json({
          success: false,
          message: "You can save a maximum of 3 addresses in your account.",
        });
      }
      user.addresses = addresses.slice(0, 3).map((addr) => ({
        name: String(addr.name || "").trim(),
        phone: String(addr.phone || "").trim(),
        street: String(addr.street || "").trim(),
        city: String(addr.city || "").trim(),
        state: String(addr.state || "").trim(),
        postalCode: String(addr.postalCode || "").trim(),
        country: String(addr.country || "India").trim(),
        isDefault: Boolean(addr.isDefault),
      }));
    }

    await user.save();

    await auditService.log({
      req,
      user,
      eventType: "CUSTOMER_PROFILE_UPDATED",
      category: "account",
      description: `Customer ${user.name} updated personal profile details`,
      entityType: "User",
      entityId: user._id,
    });

    const userObj = user.toJSON ? user.toJSON() : user.toObject();
    delete userObj.password;

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: userObj,
    });
  } catch (error) {
    console.error("[UserController] updateProfile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile.",
    });
  }
};

/**
 * POST /api/user/profile/avatar
 * Uploads a customer profile avatar using the existing local/persistent Multer storage system.
 * Saves file, updates user.avatar URL in database, and returns updated URL.
 */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload as your profile photo.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const result = await storageService.saveImage({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder: "avatars",
      req,
    });

    user.avatar = result.url;
    await user.save();

    await auditService.log({
      req,
      user,
      eventType: "CUSTOMER_AVATAR_UPDATED",
      category: "account",
      description: `Customer ${user.name} updated profile avatar`,
      entityType: "User",
      entityId: user._id,
      metadata: { avatarUrl: result.url },
    });

    const userObj = user.toJSON ? user.toJSON() : user.toObject();
    delete userObj.password;

    return res.json({
      success: true,
      message: "Profile photo updated successfully.",
      avatar: result.url,
      user: userObj,
    });
  } catch (error) {
    console.error("[UserController] uploadAvatar error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to upload avatar.",
    });
  }
};

