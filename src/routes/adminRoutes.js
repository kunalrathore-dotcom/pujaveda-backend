import express from "express";
import { getDashboardStats, getCustomers, getCustomerDetails } from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerDetails);

export default router;

