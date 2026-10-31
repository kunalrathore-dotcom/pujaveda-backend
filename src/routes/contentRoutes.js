import express from "express";
import {
  getDivineCards,
  getAllDivineCards,
  createDivineCard,
  updateDivineCard,
  deleteDivineCard,
  restoreDivineCard,
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

const router = express.Router();

// Divine Cards
router.get("/divine-cards", getDivineCards);
router.get("/divine-cards/all", authenticate, requireAdmin, getAllDivineCards);
router.post("/divine-cards", authenticate, requireAdmin, createDivineCard);
router.put("/divine-cards/:id", authenticate, requireAdmin, updateDivineCard);
router.put("/divine-cards/:id/restore", authenticate, requireAdmin, restoreDivineCard);
router.delete("/divine-cards/:id", authenticate, requireAdmin, deleteDivineCard);

// Festival Collections
router.get("/festival-collections", getFestivalCollections);
router.get("/festival-collections/all", authenticate, requireAdmin, getAllFestivalCollections);
router.post("/festival-collections", authenticate, requireAdmin, createFestivalCollection);
router.put("/festival-collections/:id", authenticate, requireAdmin, updateFestivalCollection);
router.put("/festival-collections/:id/restore", authenticate, requireAdmin, restoreFestivalCollection);
router.delete("/festival-collections/:id", authenticate, requireAdmin, deleteFestivalCollection);

export default router;

