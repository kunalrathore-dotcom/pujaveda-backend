import express from "express";
import {
  getEarningsSummary,
  getEarningsOrders,
  getEarningsChart,
} from "../controllers/earningsController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getEarningsSummarySchema,
  getEarningsOrdersSchema,
  getEarningsChartSchema,
} from "../validations/earningsValidation.js";

const router = express.Router();

// Protected admin endpoints
router.use(authenticate, requireAdmin);

router.get("/summary", validate(getEarningsSummarySchema, "query"), getEarningsSummary);
router.get("/orders", validate(getEarningsOrdersSchema, "query"), getEarningsOrders);
router.get("/chart", validate(getEarningsChartSchema, "query"), getEarningsChart);

export default router;
