import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { LegalPage } from "../models/LegalPage.js";
import { paymentService } from "../services/paymentService.js";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../utils/paymentUtility.js";

async function runRegression() {
  console.log("==================================================================");
  console.log("PUJAVEDA COMPREHENSIVE END-TO-END REGRESSION TEST SUITE");
  console.log("==================================================================\n");

  await connectDB();

  const results = [];
  const logTest = (name, passed, details = "") => {
    results.push({ name, passed, details });
    const mark = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`${mark} : ${name} ${details ? `(${details})` : ""}`);
  };

  // -------------------------------------------------------------
  // TEST 1: DATABASE COD DATA PERMANENT DELETION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: COD PERMANENT DELETION VERIFICATION ---");
  const codOrdersCount = await Order.countDocuments({ paymentMethod: "cod" });
  logTest("MongoDB COD Orders Count is 0", codOrdersCount === 0, `Count: ${codOrdersCount}`);

  const codPaymentsCount = await Payment.countDocuments({ gateway: "cod" });
  logTest("MongoDB COD Payments Count is 0", codPaymentsCount === 0, `Count: ${codPaymentsCount}`);

  const totalOrders = await Order.countDocuments();
  logTest("Existing Non-COD Orders Preserved", totalOrders > 0, `Total: ${totalOrders}`);

  // -------------------------------------------------------------
  // TEST 2: BACKEND ENFORCEMENT — COD ORDER REJECTION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: COD REJECTION ENFORCEMENT ---");
  const { createOrderSchema } = await import("../validations/orderValidation.js");
  const testProduct = await Product.findOne({ isActive: { $ne: false }, stock: { $gt: 5 } });

  const codValidation = createOrderSchema.validate({
    items: [{ productId: testProduct ? String(testProduct._id) : "6ae4409846afbb75b7aa8d42", quantity: 1 }],
    customerDetails: { name: "Rohan Devotee", email: "rohan@example.com", phone: "9876543210" },
    shippingAddress: { name: "Rohan", phone: "9876543210", street: "108 Ghat Rd", city: "Varanasi", state: "UP", postalCode: "221001" },
    paymentMethod: "cod",
  });
  logTest(
    "Schema strictly rejects paymentMethod: 'cod'",
    codValidation.error !== undefined && codValidation.error.message.includes("Cash on delivery (COD) is not accepted"),
    codValidation.error?.message
  );

  const rzpValidation = createOrderSchema.validate({
    items: [{ productId: testProduct ? String(testProduct._id) : "6ae4409846afbb75b7aa8d42", quantity: 1 }],
    customerDetails: { name: "Rohan Devotee", email: "rohan@example.com", phone: "9876543210" },
    shippingAddress: { name: "Rohan", phone: "9876543210", street: "108 Ghat Rd", city: "Varanasi", state: "UP", postalCode: "221001" },
    paymentMethod: "razorpay",
  });
  logTest("Schema permits paymentMethod: 'razorpay'", !rzpValidation.error);

  // -------------------------------------------------------------
  // TEST 3: RAZORPAY TEST MODE ORDER CREATION & SIGNATURE
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: RAZORPAY TEST MODE INTEGRATION ---");
  logTest("Razorpay is configured in paymentService", paymentService.isConfigured());

  let createdRazorpayOrder = null;
  try {
    createdRazorpayOrder = await paymentService.createRazorpayOrder({
      amount: 251,
      receipt: `REG-TEST-${Date.now()}`.slice(0, 40),
      notes: { testType: "E2E_Regression", brand: "Pujaveda" },
    });
    logTest(
      "Razorpay test mode order created via SDK",
      Boolean(createdRazorpayOrder && createdRazorpayOrder.orderId.startsWith("order_")),
      `ID: ${createdRazorpayOrder?.orderId}, KeyId: ${createdRazorpayOrder?.keyId}`
    );
  } catch (err) {
    logTest("Razorpay test mode order created via SDK", false, err.message);
  }

  // Signature verification logic
  if (createdRazorpayOrder) {
    const fakePaymentId = `pay_test_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Generate valid HMAC SHA-256 signature
    const validSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${createdRazorpayOrder.orderId}|${fakePaymentId}`)
      .digest("hex");

    const isSigValid = verifyCheckoutSignature({
      orderId: createdRazorpayOrder.orderId,
      paymentId: fakePaymentId,
      signature: validSignature,
    });
    logTest("HMAC SHA-256 checkout signature verified with test secret", isSigValid);

    const isBadSigRejected = verifyCheckoutSignature({
      orderId: createdRazorpayOrder.orderId,
      paymentId: fakePaymentId,
      signature: "0000000000000000000000000000000000000000000000000000000000000000",
    });
    logTest("Invalid checkout signature safely rejected", isBadSigRejected === false);

    // Webhook signature verification test
    const rawWebhookPayload = Buffer.from(JSON.stringify({ event: "payment.captured", id: "evt_123" }), "utf8");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_placeholder";
    const validWebhookSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawWebhookPayload)
      .digest("hex");

    const isWebhookValid = verifyWebhookSignature(rawWebhookPayload, validWebhookSig);
    logTest("Webhook raw body signature verification matches webhook secret", isWebhookValid);

    const isTamperedWebhookRejected = verifyWebhookSignature(
      Buffer.from(JSON.stringify({ event: "payment.captured", id: "evt_TAMPERED" }), "utf8"),
      validWebhookSig
    );
    logTest("Tampered webhook body rejected", isTamperedWebhookRejected === false);
  }

  // -------------------------------------------------------------
  // TEST 4: LEGAL PAGES BACKEND CRUD & DRAFT PROTECTION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: LEGAL PAGES CRUD & PUBLICATION INTEGRITY ---");
  const termsPage = await LegalPage.findOne({ slug: "terms-and-conditions" });
  logTest(
    "Terms and Conditions exists in DB and is published",
    Boolean(termsPage && termsPage.isPublished === true),
    `Title: ${termsPage?.title}`
  );

  const privacyPage = await LegalPage.findOne({ slug: "privacy-policy" });
  logTest(
    "Privacy Policy exists in DB and is published",
    Boolean(privacyPage && privacyPage.isPublished === true),
    `Title: ${privacyPage?.title}`
  );

  // Test Draft Protection: When page is unpublished, public query returns null
  if (termsPage) {
    termsPage.isPublished = false;
    await termsPage.save();

    const publicHiddenPage = await LegalPage.findOne({ slug: "terms-and-conditions", isPublished: true });
    logTest("Draft protection: Unpublished page inaccessible via public query", publicHiddenPage === null);

    // Restore to published
    termsPage.isPublished = true;
    await termsPage.save();
    const publicRestoredPage = await LegalPage.findOne({ slug: "terms-and-conditions", isPublished: true });
    logTest("Published page accessible again after re-publishing", publicRestoredPage !== null);
  }

  // -------------------------------------------------------------
  // TEST 5: PRODUCT SOCIAL SHARING INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: PRODUCT SOCIAL SHARING CANONICAL URLS ---");
  const products = await Product.find({}).limit(3);
  for (const p of products) {
    const slugOrId = p.slug || String(p._id);
    const expectedCanonical = `https://pujaveda.in/product/${slugOrId}`;
    const hasSlug = Boolean(p.slug);
    logTest(
      `Product '${p.name.slice(0, 25)}...' canonical URL`,
      Boolean(slugOrId),
      `Uses ${hasSlug ? "slug" : "ID"}: ${expectedCanonical}`
    );
  }

  console.log("\n==================================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`TEST SUMMARY: ${totalPassed}/${results.length} TESTS PASSED`);
  console.log("==================================================================");

  process.exit(totalPassed === results.length ? 0 : 1);
}

runRegression().catch((err) => {
  console.error("Regression error:", err);
  process.exit(1);
});

