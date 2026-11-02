import { PricingCharge } from "../models/PricingCharge.js";
import { ensureDefaultCharges } from "../services/pricingService.js";
import { auditService } from "../services/auditService.js";
import { ok, created, badRequest, notFound, serverError } from "../utils/apiResponse.js";

export const getAllCharges = async (req, res) => {
  try {
    await ensureDefaultCharges();
    const { isDeleted } = req.query;
    const filter = {};
    if (isDeleted === "true") {
      filter.isDeleted = true;
    } else if (isDeleted === "all") {
      // Admin request for all
    } else {
      filter.isDeleted = { $ne: true };
    }

    const charges = await PricingCharge.find(filter).sort({ createdAt: 1 });
    return ok(res, "Pricing charges retrieved successfully.", { charges });
  } catch (error) {
    console.error("[PricingController] getAllCharges error:", error);
    return serverError(res, error.message);
  }
};

export const getActiveCharges = async (req, res) => {
  try {
    await ensureDefaultCharges();
    const charges = await PricingCharge.find({ isActive: true, isDeleted: { $ne: true } }).sort({ createdAt: 1 });
    return ok(res, "Active pricing charges retrieved successfully.", { charges });
  } catch (error) {
    console.error("[PricingController] getActiveCharges error:", error);
    return serverError(res, error.message);
  }
};

export const createCharge = async (req, res) => {
  try {
    const { key, name, type, value, calculationBasis, description = "", isActive = true } = req.body;

    const fieldErrors = {};
    if (!name || !name.trim()) {
      fieldErrors.name = "Surcharge name is required.";
    } else if (name.trim().length < 2 || name.trim().length > 60) {
      fieldErrors.name = "Surcharge name must be between 2 and 60 characters.";
    }

    if (!key || !key.trim()) {
      fieldErrors.key = "Unique identifier key is required.";
    } else if (key.trim().length < 2 || key.trim().length > 40) {
      fieldErrors.key = "Charge key must be between 2 and 40 characters.";
    }

    if (!type || !["percentage", "fixed", "flat"].includes(type)) {
      fieldErrors.type = "Surcharge type is required (percentage or fixed).";
    }

    if (value === undefined || value === null || value === "" || String(value).trim() === "") {
      fieldErrors.value = "Surcharge amount or rate is required.";
    } else {
      const numValue = Number(value);
      if (!Number.isFinite(numValue) || isNaN(numValue)) {
        fieldErrors.value = "Surcharge amount or rate must be a valid number.";
      } else if (numValue <= 0) {
        fieldErrors.value = "Surcharge amount or rate must be greater than zero.";
      } else if (type === "percentage" && numValue > 100) {
        fieldErrors.value = "Percentage surcharge rate cannot exceed 100%.";
      } else if (numValue > 50000) {
        fieldErrors.value = "Fixed surcharge amount cannot exceed ₹50,000.";
      }
    }

    const calcBasis = type === "fixed" ? "fixed" : (calculationBasis || "discounted_subtotal");
    if (type === "percentage" && !calculationBasis) {
      fieldErrors.calculationBasis = "Calculation type is required.";
    }

    if (description && description.trim().length > 300) {
      fieldErrors.description = "Customer explanation description cannot exceed 300 characters.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      const primary = Object.values(fieldErrors)[0];
      return badRequest(res, primary, fieldErrors);
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const existing = await PricingCharge.findOne({ key: cleanKey });
    if (existing) {
      return badRequest(res, `A surcharge with key '${cleanKey}' already exists.`, {
        key: `A surcharge with key '${cleanKey}' already exists.`,
      });
    }

    const numValue = Math.round(Number(value) * 100) / 100;

    const charge = await PricingCharge.create({
      key: cleanKey,
      name: name.trim(),
      type: type === "fixed" ? "fixed" : "percentage",
      value: numValue,
      calculationBasis: calcBasis,
      description: description.trim(),
      isActive: Boolean(isActive),
    });

    await auditService.log({
      req,
      user: req.user,
      eventType: "PRICING_CHARGE_CREATED",
      category: "admin",
      description: `Admin created pricing charge '${charge.name}' (${charge.type}: ${charge.value})`,
      entityType: "PricingCharge",
      entityId: charge._id,
      metadata: { key: charge.key, type: charge.type, value: charge.value },
    });

    return created(res, "Pricing charge created successfully.", { charge });
  } catch (error) {
    console.error("[PricingController] createCharge error:", error);
    return serverError(res, error.message);
  }
};

export const updateCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await PricingCharge.findById(id);

    if (!charge) {
      return notFound(res, "Pricing charge not found.");
    }

    const { name, type, value, calculationBasis, description, isActive } = req.body;

    if (name !== undefined) charge.name = name.trim();
    if (type !== undefined) {
      if (!["percentage", "fixed"].includes(type)) {
        return badRequest(res, "Type must be 'percentage' or 'fixed'.");
      }
      charge.type = type;
    }

    if (value !== undefined) {
      const numValue = Number(value);
      if (!Number.isFinite(numValue) || numValue < 0) {
        return badRequest(res, "Charge value must be a non-negative number.");
      }
      if (charge.type === "percentage" && numValue > 100) {
        return badRequest(res, "Percentage rate cannot exceed 100%.");
      }
      charge.value = numValue;
    }

    if (calculationBasis !== undefined) charge.calculationBasis = calculationBasis;
    if (description !== undefined) charge.description = description.trim();
    if (isActive !== undefined) charge.isActive = Boolean(isActive);

    await charge.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "PRICING_CHARGE_UPDATED",
      category: "admin",
      description: `Admin updated pricing charge '${charge.name}' (${charge.type}: ${charge.value})`,
      entityType: "PricingCharge",
      entityId: charge._id,
      metadata: { key: charge.key, value: charge.value, type: charge.type },
    });

    return ok(res, "Pricing charge updated successfully.", { charge });
  } catch (error) {
    console.error("[PricingController] updateCharge error:", error);
    return serverError(res, error.message);
  }
};

export const toggleChargeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await PricingCharge.findById(id);

    if (!charge) {
      return notFound(res, "Pricing charge not found.");
    }

    charge.isActive = !charge.isActive;
    await charge.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "PRICING_CHARGE_STATUS_TOGGLED",
      category: "admin",
      description: `Admin toggled charge '${charge.name}' to ${charge.isActive ? "active" : "inactive"}`,
      entityType: "PricingCharge",
      entityId: charge._id,
    });

    return ok(res, `Charge marked as ${charge.isActive ? "active" : "inactive"}.`, { charge });
  } catch (error) {
    console.error("[PricingController] toggleChargeStatus error:", error);
    return serverError(res, error.message);
  }
};

export const deleteCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await PricingCharge.findById(id);

    if (!charge) {
      return notFound(res, "Pricing charge not found.");
    }

    // Protect default standard system charges from deletion
    if (charge.key === "gst" || charge.key === "platform_fee") {
      charge.isActive = false;
      await charge.save();
      return ok(res, `Standard charge '${charge.name}' cannot be moved to trash. It has been deactivated instead.`);
    }

    // Global Soft Delete: Retain charge, mark isDeleted: true
    charge.isDeleted = true;
    charge.deletedAt = new Date();
    charge.deletedBy = req.user?._id || null;
    charge.isActive = false;
    await charge.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "PRICING_CHARGE_SOFT_DELETED",
      category: "admin",
      description: `Admin moved pricing charge '${charge.name}' to trash`,
      entityType: "PricingCharge",
      entityId: charge._id,
    });

    return ok(res, "Pricing charge moved to trash successfully.");
  } catch (error) {
    console.error("[PricingController] deleteCharge error:", error);
    return serverError(res, error.message);
  }
};

export const restoreCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await PricingCharge.findById(id);

    if (!charge) {
      return notFound(res, "Pricing charge not found.");
    }

    charge.isDeleted = false;
    charge.deletedAt = null;
    charge.deletedBy = null;
    await charge.save();

    await auditService.log({
      req,
      user: req.user,
      eventType: "PRICING_CHARGE_RESTORED",
      category: "admin",
      description: `Admin restored pricing charge '${charge.name}'`,
      entityType: "PricingCharge",
      entityId: charge._id,
    });

    return ok(res, "Pricing charge restored successfully.");
  } catch (error) {
    console.error("[PricingController] restoreCharge error:", error);
    return serverError(res, error.message);
  }
};

export const bulkDeleteCharges = async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = { key: { $nin: ["gst", "platform_fee"] } };
    if (Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    } else {
      filter.isDeleted = { $ne: true };
    }
    const result = await PricingCharge.updateMany(filter, {
      $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?._id || null, isActive: false },
    });
    return ok(res, `${result.modifiedCount} surcharge(s) moved to trash.`);
  } catch (error) {
    return serverError(res, error.message);
  }
};

export const bulkRestoreCharges = async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = { isDeleted: true };
    if (Array.isArray(ids) && ids.length > 0) {
      filter._id = { $in: ids };
    }
    const result = await PricingCharge.updateMany(filter, {
      $set: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
    return ok(res, `${result.modifiedCount} surcharge(s) restored successfully.`);
  } catch (error) {
    return serverError(res, error.message);
  }
};

