import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";
import { blogPublicRoutes, blogAdminRoutes } from "./routes/blogRoutes.js";
import legalPageRoutes from "./routes/legalPageRoutes.js";
import { seedDefaultLegalPages } from "./controllers/legalPageController.js";
import { getRedisStatus } from "./config/redis.js";
import { getUploadDir } from "./services/storageService.js";

import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  process.env.FRONTEND_USER_URL,
  process.env.FRONTEND_ADMIN_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    },
    credentials: true,
  })
);

// Capture raw body for webhook verification while parsing JSON for all endpoints
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buffer) => {
      if (req.originalUrl && req.originalUrl.split("?")[0] === "/api/payments/webhook") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Statically serve uploaded files from persistent disk or local fallback
const uploadsPath = getUploadDir();
app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Fallback for missing uploaded image files
app.use("/uploads", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested image file not found on server.",
  });
});

// Health check endpoint with database and redis statuses
app.get("/api/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = await getRedisStatus();

  res.json({
    status: "ok",
    service: "sonic-backend",
    database: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/earnings", earningsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/pricing-charges", pricingRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/blog", blogPublicRoutes);
app.use("/api/admin/blog", blogAdminRoutes);
app.use("/api/legal", legalPageRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
