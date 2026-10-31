import express from "express";
import { getDashboardStats, getCustomers } from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/customers", getCustomers);

export default router;

