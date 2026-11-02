import express from "express";
import {
  getDivineCards,
  getAllDivineCards,
  createDivineCard,
  updateDivineCard,
  deleteDivineCard,
  restoreDivineCard,
  bulkDeleteDivineCards,
  bulkRestoreDivineCards,
} from "../controllers/divineCardController.js";
import {
  getFestivalCollections,
  getAllFestivalCollections,
  createFestivalCollection,
  updateFestivalCollection,
  deleteFestivalCollection,
  restoreFestivalCollection,
} from "../controllers/festivalCollectionController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  divineCardSchema,
  updateDivineCardSchema,
  festivalCollectionSchema,
  updateFestivalCollectionSchema,
} from "../validations/contentValidation.js";

const router = express.Router();

// Divine Cards
router.get("/divine-cards", getDivineCards);
router.get("/divine-cards/all", authenticate, requireAdmin, getAllDivineCards);
router.post("/divine-cards/bulk-trash", authenticate, requireAdmin, bulkDeleteDivineCards);
router.post("/divine-cards/bulk-restore", authenticate, requireAdmin, bulkRestoreDivineCards);
router.post(
  "/divine-cards",
  authenticate,
  requireAdmin,
  validate(divineCardSchema),
  createDivineCard
);
router.put(
  "/divine-cards/:id",
  authenticate,
  requireAdmin,
  validate(updateDivineCardSchema),
  updateDivineCard
);
router.put("/divine-cards/:id/restore", authenticate, requireAdmin, restoreDivineCard);
router.delete("/divine-cards/:id", authenticate, requireAdmin, deleteDivineCard);

// Festival Collections
router.get("/festival-collections", getFestivalCollections);
router.get("/festival-collections/all", authenticate, requireAdmin, getAllFestivalCollections);
router.post(
  "/festival-collections",
  authenticate,
  requireAdmin,
  validate(festivalCollectionSchema),
  createFestivalCollection
);
router.put(
  "/festival-collections/:id",
  authenticate,
  requireAdmin,
  validate(updateFestivalCollectionSchema),
  updateFestivalCollection
);
router.put("/festival-collections/:id/restore", authenticate, requireAdmin, restoreFestivalCollection);
router.delete("/festival-collections/:id", authenticate, requireAdmin, deleteFestivalCollection);

export default router;

