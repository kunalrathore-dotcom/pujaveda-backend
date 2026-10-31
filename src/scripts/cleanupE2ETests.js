import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Coupon } from "../models/Coupon.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { Order } from "../models/Order.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function cleanup() {
  await connectDB();
  await Coupon.deleteMany({ code: { $in: ["TESTFIXED500", "TESTPERC20", "TESTMIN1000", "TESTEXPIRED"] } });
  await CouponUsage.deleteMany({ couponCode: { $in: ["TESTFIXED500", "TESTPERC20", "TESTMIN1000", "TESTEXPIRED"] } });
  await Order.deleteMany({ orderNumber: { $regex: /^PLX-E2E-/ } });
  console.log("✓ Test cleanup completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

cleanup();

