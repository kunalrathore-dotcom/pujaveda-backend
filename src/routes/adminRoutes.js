import express from "express";
import { getDashboardStats, getCustomers, getCustomerDetails } from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { customerQuerySchema, customerParamsSchema } from "../validations/adminValidation.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/customers", validate(customerQuerySchema, "query"), getCustomers);
router.get("/customers/:id", validate(customerParamsSchema, "params"), getCustomerDetails);

export default router;

