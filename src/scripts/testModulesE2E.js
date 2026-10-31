import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { PricingCharge } from "../models/PricingCharge.js";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import { pricingService } from "../services/pricingService.js";
import { couponService } from "../services/couponService.js";
import { auditService } from "../services/auditService.js";

async function runE2ETests() {
  console.log("=== STARTING PLUXPC MODULES E2E TEST SUITE ===");

  await connectDB();
  console.log("✓ Connected to MongoDB");

  // 1. Get or create a sample product
  let product = await Product.findOne({ stock: { $gt: 5 } });
  if (!product) {
    product = await Product.create({
      name: "Pluxpc Test Monitor",
      slug: "pluxpc-test-monitor-" + Date.now(),
      price: 2000,
      stock: 50,
      description: "Test monitor for e2e validation",
    });
  }
  console.log(`✓ Using Product: "${product.name}" (Price: ₹${product.price})`);

  // 2. Get or create a test user
  let user = await User.findOne({ role: "user" });
  if (!user) {
    user = await User.create({
      name: "Test Customer",
      email: `test_customer_${Date.now()}@pluxpc.test`,
      password: "HashedPassword123!",
      role: "user",
    });
  }
  console.log(`✓ Using User: "${user.name}" (${user.email})`);

  // ==========================================
  // MODULE 1 TESTS: COUPON MANAGEMENT
  // ==========================================
  console.log("\n--- TESTING MODULE 1: COUPON MANAGEMENT ---");

  // Clean up any old test coupons
  await Coupon.deleteMany({ code: { $in: ["TESTFIXED500", "TESTPERC20", "TESTMIN1000", "TESTEXPIRED"] } });

  // 1A. Create fixed discount coupon
  const fixedCoupon = await Coupon.create({
    code: "TESTFIXED500",
    description: "Flat ₹500 off",
    discountType: "fixed",
    discountValue: 500,
    minCartValue: 500,
    isActive: true,
  });
  console.log("✓ Created Fixed Coupon:", fixedCoupon.code);

  // 1B. Create percentage coupon with max discount cap
  const percCoupon = await Coupon.create({
    code: "TESTPERC20",
    description: "20% off up to ₹250",
    discountType: "percentage",
    discountValue: 20,
    maxDiscount: 250,
    minCartValue: 500,
    isActive: true,
  });
  console.log("✓ Created Percentage Coupon with Cap:", percCoupon.code);

  // 1C. Test validation & calculation of Fixed Coupon
  const fixedCalc = await couponService.validateAndCalculate({
    code: "TESTFIXED500",
    items: [{ productId: product._id, quantity: 2 }], // 2 * 2000 = 4000
    user,
  });
  console.log(`✓ Fixed coupon calculated discount: ₹${fixedCalc.discount} (Expected: 500)`);
  if (fixedCalc.discount !== 500) throw new Error("Fixed coupon discount mismatch!");

  // 1D. Test validation & calculation of Percentage Coupon with Cap
  // 20% of 4000 = 800, but cap is 250 -> should be 250
  const percCalc = await couponService.validateAndCalculate({
    code: "TESTPERC20",
    items: [{ productId: product._id, quantity: 2 }],
    user,
  });
  console.log(`✓ Capped coupon calculated discount: ₹${percCalc.discount} (Expected: 250 cap)`);
  if (percCalc.discount !== 250) throw new Error("Capped percentage coupon discount mismatch!");

  // 1E. Test Expired Coupon Rejection
  const expiredCoupon = await Coupon.create({
    code: "TESTEXPIRED",
    discountType: "fixed",
    discountValue: 100,
    expiryDate: new Date(Date.now() - 86400000), // Yesterday
    isActive: true,
  });
  let rejected = false;
  try {
    await couponService.validateAndCalculate({
      code: "TESTEXPIRED",
      items: [{ productId: product._id, quantity: 1 }],
      user,
    });
  } catch (err) {
    rejected = true;
    console.log("✓ Successfully rejected expired coupon:", err.message);
  }
  if (!rejected) throw new Error("Expired coupon was not rejected!");

  // ==========================================
  // MODULE 2 TESTS: TAX & PLATFORM FEE ENGINE
  // ==========================================
  console.log("\n--- TESTING MODULE 2: TAX & PLATFORM FEE ENGINE ---");

  // Verify seeds
  await pricingService.getActiveCharges();
  const gstCharge = await PricingCharge.findOne({ key: "gst" });
  const platformCharge = await PricingCharge.findOne({ key: "platform_fee" });
  console.log(`✓ GST Charge configured: ${gstCharge.value}% (${gstCharge.calculationBasis})`);
  console.log(`✓ Platform Fee Charge configured: ${platformCharge.value}%`);

  // Calculate pricing quote for 1 item with TESTFIXED500 coupon (₹500 off)
  const expectedSubtotal = product.price;
  const expectedDiscount = Math.min(500, expectedSubtotal);
  const expectedDiscounted = expectedSubtotal - expectedDiscount;
  const expectedGst = Math.round(((expectedDiscounted * 18) / 100) * 100) / 100;
  const expectedPlatform = Math.round(((expectedDiscounted * 2) / 100) * 100) / 100;
  const expectedTotal = Math.round((expectedDiscounted + expectedGst + expectedPlatform) * 100) / 100;

  const quote = await pricingService.calculateOrderPricing({
    rawItems: [{ productId: product._id, quantity: 1 }],
    couponCode: "TESTFIXED500",
    user,
  });

  console.log("✓ Order Quote Calculation Results:");
  console.log(`  - Subtotal: ₹${quote.subtotal} (Expected: ₹${expectedSubtotal})`);
  console.log(`  - Coupon Discount: ₹${quote.coupon.discount} (${quote.coupon.code})`);
  console.log(`  - Discounted Subtotal: ₹${quote.discountedSubtotal} (Expected: ₹${expectedDiscounted})`);
  console.log(`  - Tax Amount (GST): ₹${quote.taxAmount} (Expected: ₹${expectedGst})`);
  console.log(`  - Platform Fee: ₹${quote.platformFee} (Expected: ₹${expectedPlatform})`);
  console.log(`  - Total Amount: ₹${quote.totalAmount} (Expected: ₹${expectedTotal})`);

  if (quote.subtotal !== expectedSubtotal) throw new Error(`Subtotal mismatch! Expected ${expectedSubtotal}, got ${quote.subtotal}`);
  if (quote.discountedSubtotal !== expectedDiscounted) throw new Error(`Discounted Subtotal mismatch! Expected ${expectedDiscounted}, got ${quote.discountedSubtotal}`);
  if (quote.taxAmount !== expectedGst) throw new Error(`Tax amount mismatch! Expected ${expectedGst}, got ${quote.taxAmount}`);
  if (quote.platformFee !== expectedPlatform) throw new Error(`Platform fee mismatch! Expected ${expectedPlatform}, got ${quote.platformFee}`);
  if (quote.totalAmount !== expectedTotal) throw new Error(`Total amount mismatch! Expected ${expectedTotal}, got ${quote.totalAmount}`);

  // ==========================================
  // ORDER PLACEMENT & IMMUTABLE PERSISTENCE
  // ==========================================
  console.log("\n--- TESTING ORDER PLACEMENT & IMMUTABILITY ---");

  const orderNumber = `PLX-E2E-${Date.now()}`;
  const testOrder = await Order.create({
    orderNumber,
    user: user._id,
    customerDetails: {
      name: user.name,
      email: user.email,
      phone: "9876543210",
    },
    items: [
      {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
      },
    ],
    shippingAddress: {
      street: "123 Tech Park",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
    },
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: "Processing",
    // Immutable breakdown fields
    subtotal: quote.subtotal,
    coupon: quote.coupon,
    discountedSubtotal: quote.discountedSubtotal,
    taxAmount: quote.taxAmount,
    platformFee: quote.platformFee,
    chargesBreakdown: quote.chargesBreakdown,
    totalAmount: quote.totalAmount,
  });

  console.log(`✓ Order created successfully: ${testOrder.orderNumber} (ID: ${testOrder._id})`);
  console.log(`✓ Stored immutable coupon: ${testOrder.coupon.code} (-₹${testOrder.coupon.discount})`);
  console.log(`✓ Stored immutable tax: ₹${testOrder.taxAmount}, platform fee: ₹${testOrder.platformFee}`);

  // Record coupon usage
  const usageRecord = await couponService.recordRedemption({
    couponCode: fixedCoupon.code,
    user,
    order: testOrder,
    discountAmount: quote.coupon.discount,
    orderTotal: testOrder.totalAmount,
  });
  console.log(`✓ Coupon redemption recorded: Usage ID ${usageRecord._id}`);

  // Verify coupon usage increment
  const updatedCoupon = await Coupon.findById(fixedCoupon._id);
  console.log(`✓ Coupon '${updatedCoupon.code}' total redemptions: ${updatedCoupon.usedCount}`);
  if (updatedCoupon.usedCount !== 1) throw new Error("Coupon usage count did not increment!");

  // ==========================================
  // MODULE 3 TESTS: AUDIT LOGGING SYSTEM
  // ==========================================
  console.log("\n--- TESTING MODULE 3: USER ACTIVITY AUDIT SYSTEM ---");

  // Log several test activities
  await auditService.log({
    user,
    eventType: "USER_LOGGED_IN",
    category: "auth",
    description: `User ${user.email} logged in successfully`,
    metadata: { ip: "127.0.0.1", browser: "TestBrowser/1.0" },
  });

  await auditService.log({
    user,
    eventType: "PRODUCT_VIEWED",
    category: "product",
    description: `User viewed ${product.name}`,
    entityType: "Product",
    entityId: product._id,
    metadata: { price: product.price },
  });

  await auditService.log({
    user,
    eventType: "COUPON_APPLIED",
    category: "shopping",
    description: `User applied coupon ${fixedCoupon.code}`,
    entityType: "Coupon",
    entityId: fixedCoupon._id,
    metadata: { code: fixedCoupon.code, discount: 500 },
  });

  await auditService.log({
    user,
    eventType: "ORDER_PLACED",
    category: "shopping",
    description: `Order ${testOrder.orderNumber} placed`,
    entityType: "Order",
    entityId: testOrder._id,
    metadata: { totalAmount: testOrder.totalAmount },
  });

  // Verify Audit Logs retrieval
  const logs = await AuditLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
  console.log(`✓ Retrieved ${logs.length} audit logs for user ${user.name}`);
  const eventTypes = logs.map((l) => l.eventType);
  console.log("  Logged Events:", eventTypes);

  if (!eventTypes.includes("USER_LOGGED_IN") || !eventTypes.includes("ORDER_PLACED")) {
    throw new Error("Missing expected audit events in database!");
  }

  // Verify Audit Stats computation
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const activitiesToday = await AuditLog.countDocuments({ createdAt: { $gte: startOfToday } });
  console.log(`✓ Total Audit Activities recorded today: ${activitiesToday}`);
  if (activitiesToday < 4) throw new Error("Audit activities count today is lower than expected!");

  console.log("\n==========================================");
  console.log("🎉 ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
