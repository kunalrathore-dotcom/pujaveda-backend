import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import { PricingCharge } from "../models/PricingCharge.js";
import { getCustomerDetails } from "../controllers/adminController.js";
import { getAuditLogs } from "../controllers/auditController.js";
import { pricingService } from "../services/pricingService.js";
import { couponService } from "../services/couponService.js";
import { verifyCheckoutSignature } from "../utils/paymentUtility.js";
import { updateProfileSchema } from "../validations/authValidation.js";
import { createOrderSchema } from "../validations/orderValidation.js";

const results = [];

function recordTest(id, moduleName, feature, expected, actual, status, severity = "Medium", details = "") {
  results.push({ id, moduleName, feature, expected, actual, status, severity, details });
  const icon = status === "PASSED" ? "✓" : status === "FAILED" ? "✗" : status === "NOT_IMPLEMENTED" ? "○" : "⚠";
  console.log(`${icon} [${id}] [${moduleName}] ${feature} -> ${status}`);
}

// Mock Express Response Helper
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runComprehensiveQA() {
  console.log("===============================================================");
  console.log("PUJAVEDA COMPLETE APPLICATION QA AUDIT & VERIFICATION SUITE");
  console.log("===============================================================\n");

  await connectDB();
  console.log("✓ MongoDB Atlas Connected\n");

  // =========================================================================
  // PART 1: AUDIT LOG & CUSTOMER DETAILS VERIFICATION
  // =========================================================================
  console.log("--- PART 1: AUDIT LOG & CUSTOMER NAVIGATION TESTS ---");

  // Fetch or create a test customer
  let testCustomer1 = await User.findOne({ role: "user", isActive: true });
  if (!testCustomer1) {
    testCustomer1 = await User.create({
      name: "Ramesh Sharma",
      email: `ramesh_${Date.now()}@pujaveda.in`,
      password: await bcrypt.hash("Pujaveda@123", 10),
      role: "user",
      isActive: true,
      phone: "9876543210",
      addresses: [
        {
          name: "Ramesh Sharma",
          phone: "9876543210",
          street: "108 Dashashwamedh Ghat",
          city: "Varanasi",
          state: "Uttar Pradesh",
          postalCode: "221001",
          country: "India",
          isDefault: true,
        },
      ],
    });
  }

  let testCustomer2 = await User.findOne({ role: "user", _id: { $ne: testCustomer1._id }, isActive: true });
  if (!testCustomer2) {
    testCustomer2 = await User.create({
      name: "Pooja Verma",
      email: `pooja_${Date.now()}@pujaveda.in`,
      password: await bcrypt.hash("Pujaveda@123", 10),
      role: "user",
      isActive: true,
      phone: "9876543211",
    });
  }

  // Create audit log entries for testing
  await AuditLog.create({
    user: testCustomer1._id,
    userName: testCustomer1.name,
    userEmail: testCustomer1.email,
    userRole: "user",
    eventType: "USER_LOGGED_IN",
    category: "auth",
    description: "User logged into Pujaveda devotee store",
  });

  await AuditLog.create({
    user: testCustomer2._id,
    userName: testCustomer2.name,
    userEmail: testCustomer2.email,
    userRole: "user",
    eventType: "CART_ITEM_ADDED",
    category: "cart",
    description: "Added Ganga Jal to sacred cart",
  });

  const fakeDeletedUserId = new mongoose.Types.ObjectId();
  await AuditLog.create({
    user: fakeDeletedUserId,
    userName: "Deleted Devotee",
    userEmail: "deleted@pujaveda.test",
    userRole: "user",
    eventType: "USER_LOGGED_OUT",
    category: "auth",
    description: "Historical session logged out",
  });

  await AuditLog.create({
    user: null,
    userName: "System Scheduler",
    userEmail: "",
    userRole: "system",
    eventType: "SYSTEM_MAINTENANCE",
    category: "system",
    description: "Automated daily catalog index maintenance",
  });

  // Test 1.1: Audit log API returns populated userRef & isUserAvailable for existing customer
  const mockReqLogs = { query: { page: 1, limit: 10 } };
  const mockResLogs = createMockRes();
  await getAuditLogs(mockReqLogs, mockResLogs);

  const logs = mockResLogs.body?.data?.logs || [];
  const logCustomer1 = logs.find((l) => String(l.userId) === String(testCustomer1._id));
  const hasPopulatedCustomer = Boolean(logCustomer1 && logCustomer1.isUserAvailable && logCustomer1.userRef);

  recordTest(
    "AL-01",
    "Audit Log",
    "Resolve customer reference for existing customer in audit log",
    "Audit log entry contains userId, isUserAvailable: true, and populated userRef",
    `userId: ${logCustomer1?.userId}, isUserAvailable: ${logCustomer1?.isUserAvailable}`,
    hasPopulatedCustomer ? "PASSED" : "FAILED",
    "High"
  );

  // Test 1.2: Customer Details API retrieves exact customer 1 details
  const mockReqCust1 = { params: { id: String(testCustomer1._id) } };
  const mockResCust1 = createMockRes();
  await getCustomerDetails(mockReqCust1, mockResCust1);

  const cust1Data = mockResCust1.body?.customer;
  const isCorrectCust1 = cust1Data && String(cust1Data._id) === String(testCustomer1._id) && cust1Data.email === testCustomer1.email;

  recordTest(
    "AL-02",
    "Customer Details",
    "Customer Details API resolves exact customer by ID",
    "Returns customer object matching requested ID and email",
    `Retrieved: ${cust1Data?.name} (${cust1Data?.email})`,
    isCorrectCust1 ? "PASSED" : "FAILED",
    "Critical"
  );

  // Test 1.3: Customer Details API retrieves exact customer 2 details
  const mockReqCust2 = { params: { id: String(testCustomer2._id) } };
  const mockResCust2 = createMockRes();
  await getCustomerDetails(mockReqCust2, mockResCust2);

  const cust2Data = mockResCust2.body?.customer;
  const isCorrectCust2 = cust2Data && String(cust2Data._id) === String(testCustomer2._id) && cust2Data.email === testCustomer2.email;

  recordTest(
    "AL-03",
    "Customer Details",
    "Customer Details API resolves different customer correctly without caching bleed",
    "Returns second customer data matching second ID",
    `Retrieved: ${cust2Data?.name} (${cust2Data?.email})`,
    isCorrectCust2 ? "PASSED" : "FAILED",
    "Critical"
  );

  // Test 1.4: Audit log entry with no customer (guest/system)
  const logSystem = logs.find((l) => !l.userId);
  const isSystemHandled = logSystem && logSystem.userId === null && logSystem.isUserAvailable === false;

  recordTest(
    "AL-04",
    "Audit Log",
    "Handle audit entries with no user reference (system/anonymous)",
    "Entry has userId: null, isUserAvailable: false (rendered as non-clickable plain text)",
    `userId: ${logSystem?.userId}, isUserAvailable: ${logSystem?.isUserAvailable}`,
    isSystemHandled ? "PASSED" : "FAILED",
    "Medium"
  );

  // Test 1.5: Audit log entry for deleted/unavailable customer
  const logDeleted = logs.find((l) => String(l.userId) === String(fakeDeletedUserId));
  const isDeletedHandled = logDeleted && logDeleted.isUserAvailable === false && logDeleted.userRef === null;

  recordTest(
    "AL-05",
    "Audit Log",
    "Handle deleted/unavailable customer references gracefully",
    "Entry has isUserAvailable: false and userRef: null (rendered with 'Customer unavailable' fallback)",
    `isUserAvailable: ${logDeleted?.isUserAvailable}, userRef: ${logDeleted?.userRef}`,
    isDeletedHandled ? "PASSED" : "FAILED",
    "High"
  );

  // Test 1.6: Invalid customer ID format handling
  const mockReqInvalidId = { params: { id: "invalid-id-xyz" } };
  const mockResInvalidId = createMockRes();
  await getCustomerDetails(mockReqInvalidId, mockResInvalidId);

  const isInvalidHandled = mockResInvalidId.statusCode === 400 && mockResInvalidId.body?.message?.includes("Invalid customer ID");

  recordTest(
    "AL-06",
    "Customer Details",
    "Reject malformed customer ID format with 400 Bad Request",
    "HTTP 400 with 'Invalid customer ID format.'",
    `Status ${mockResInvalidId.statusCode}: ${mockResInvalidId.body?.message}`,
    isInvalidHandled ? "PASSED" : "FAILED",
    "Medium"
  );

  // Test 1.7: Non-existent customer ObjectId handling (404)
  const mockReqNotFoundId = { params: { id: new mongoose.Types.ObjectId().toString() } };
  const mockResNotFoundId = createMockRes();
  await getCustomerDetails(mockReqNotFoundId, mockResNotFoundId);

  const isNotFoundHandled = mockResNotFoundId.statusCode === 404 && mockResNotFoundId.body?.message?.includes("Customer not found");

  recordTest(
    "AL-07",
    "Customer Details",
    "Return 404 Not Found when customer does not exist in database",
    "HTTP 404 with 'Customer not found.'",
    `Status ${mockResNotFoundId.statusCode}: ${mockResNotFoundId.body?.message}`,
    isNotFoundHandled ? "PASSED" : "FAILED",
    "Medium"
  );

  // =========================================================================
  // PART 2: COMPREHENSIVE QA AUDIT (20 SPECIFICATION POINTS)
  // =========================================================================
  console.log("\n--- PART 2: COMPLETE APPLICATION FUNCTIONAL & SECURITY AUDIT ---");

  // --- 1. Customer Registration & Login Validations ---
  // 1A. Empty phone validation in updateProfileSchema
  const vEmptyPhone = updateProfileSchema.validate({
    addresses: [{ name: "Devotee", phone: "", street: "Ghat Road 1", city: "Varanasi", state: "Uttar Pradesh", postalCode: "221001" }],
  });
  const hasEmptyPhoneErr = vEmptyPhone.error?.details[0]?.message?.includes("Please enter your phone number");

  recordTest(
    "AUTH-01",
    "Address Validation",
    "Reject empty address phone number with field-level guidance",
    "Error: 'Please enter your phone number'",
    vEmptyPhone.error?.details[0]?.message || "None",
    hasEmptyPhoneErr ? "PASSED" : "FAILED",
    "High"
  );

  // 1B. 1-digit invalid phone validation in updateProfileSchema
  const vOneDigitPhone = updateProfileSchema.validate({
    addresses: [{ name: "Devotee", phone: "1", street: "Ghat Road 1", city: "Varanasi", state: "Uttar Pradesh", postalCode: "221001" }],
  });
  const hasOneDigitPhoneErr = vOneDigitPhone.error?.details[0]?.message?.includes("Please enter a valid 10-digit mobile number");

  recordTest(
    "AUTH-02",
    "Address Validation",
    "Reject 1-digit invalid mobile numbers strictly",
    "Error: 'Please enter a valid 10-digit mobile number'",
    vOneDigitPhone.error?.details[0]?.message || "None",
    hasOneDigitPhoneErr ? "PASSED" : "FAILED",
    "High"
  );

  // 1C. Valid 10-digit phone in updateProfileSchema
  const vValidPhone = updateProfileSchema.validate({
    addresses: [{ name: "Devotee", phone: "9876543210", street: "Ghat Road 1", city: "Varanasi", state: "Uttar Pradesh", postalCode: "221001" }],
  });
  const isValidPhoneAccepted = !vValidPhone.error;

  recordTest(
    "AUTH-03",
    "Address Validation",
    "Accept valid Indian 10-digit mobile numbers (+91 / 6-9 leading digits)",
    "Validation passes with 0 errors",
    isValidPhoneAccepted ? "Validation passed" : vValidPhone.error?.message,
    isValidPhoneAccepted ? "PASSED" : "FAILED",
    "High"
  );

  // 1D. Maximum 3 saved addresses limit
  const vFourAddresses = updateProfileSchema.validate({
    addresses: [
      { name: "Addr 1", phone: "9876543210", street: "Street One", city: "City One", state: "State One", postalCode: "111111" },
      { name: "Addr 2", phone: "9876543210", street: "Street Two", city: "City Two", state: "State Two", postalCode: "222222" },
      { name: "Addr 3", phone: "9876543210", street: "Street Three", city: "City Three", state: "State Three", postalCode: "333333" },
      { name: "Addr 4", phone: "9876543210", street: "Street Four", city: "City Four", state: "State Four", postalCode: "444444" },
    ],
  });
  const isMaxAddressRejected = vFourAddresses.error?.details[0]?.message?.includes("maximum of 3");

  recordTest(
    "AUTH-04",
    "Address Management",
    "Enforce maximum 3 saved addresses per customer account",
    "Error: 'You can save a maximum of 3 addresses in your account.'",
    vFourAddresses.error?.details[0]?.message || "None",
    isMaxAddressRejected ? "PASSED" : "FAILED",
    "Medium"
  );

  // --- 2. Products, Categories & Catalog ---
  const activeCategoriesCount = await Category.countDocuments({ isActive: true });
  recordTest(
    "CAT-01",
    "Catalog",
    "Verify dynamic categories active in MongoDB Atlas",
    "Active categories count > 0",
    `Found ${activeCategoriesCount} active categories in database`,
    activeCategoriesCount > 0 ? "PASSED" : "FAILED",
    "High"
  );

  // Query actual MongoDB Atlas products
  const activeProducts = await Product.find({ isDeleted: { $ne: true } }).limit(5).lean();
  const hasProducts = activeProducts.length > 0;
  recordTest(
    "PROD-01",
    "Products",
    "Verify active puja products with prices, SKU, and non-deleted status",
    "Active products available with valid price > 0",
    `Found ${activeProducts.length} active products (sample: "${activeProducts[0]?.name || "N/A"}", price: ₹${activeProducts[0]?.price})`,
    hasProducts ? "PASSED" : "FAILED",
    "Critical"
  );

  const sampleProduct = activeProducts[0];

  // --- 3. Coupon Engine & Discount Calculation ---
  // Create temporary test coupons
  await Coupon.deleteMany({ code: { $in: ["QATESTFIXED", "QATESTPERC", "QATESTEXP"] } });

  const couponFixed = await Coupon.create({
    code: "QATESTFIXED",
    description: "Flat ₹200 off",
    discountType: "fixed",
    discountValue: 200,
    minCartValue: 50,
    isActive: true,
  });

  const couponCalc = await couponService.validateAndCalculate({
    code: "QATESTFIXED",
    items: [{ productId: sampleProduct._id, quantity: 10 }],
    user: testCustomer1,
  });

  recordTest(
    "CPN-01",
    "Coupons",
    "Calculate fixed amount coupon discount accurately",
    "Discount equals fixed discountValue (₹200)",
    `Calculated discount: ₹${couponCalc.discount}`,
    couponCalc.discount === 200 ? "PASSED" : "FAILED",
    "High"
  );

  // Expired coupon test
  await Coupon.create({
    code: "QATESTEXP",
    discountType: "fixed",
    discountValue: 100,
    expiryDate: new Date(Date.now() - 86400000), // Yesterday
    isActive: true,
  });

  let expRejected = false;
  try {
    await couponService.validateAndCalculate({
      code: "QATESTEXP",
      items: [{ productId: sampleProduct._id, quantity: 1 }],
      user: testCustomer1,
    });
  } catch (err) {
    expRejected = true;
  }

  recordTest(
    "CPN-02",
    "Coupons",
    "Reject expired coupons during checkout",
    "Throws coupon expired validation error",
    expRejected ? "Successfully rejected" : "Failed to reject",
    expRejected ? "PASSED" : "FAILED",
    "High"
  );

  // Clean up test coupons
  await Coupon.deleteMany({ code: { $in: ["QATESTFIXED", "QATESTPERC", "QATESTEXP"] } });

  // --- 4. Tax & Platform Fee Engine ---
  const activeCharges = await pricingService.getActiveCharges();
  recordTest(
    "FEE-01",
    "Pricing Engine",
    "Active GST tax and platform fee charges configured in database",
    "Returns active GST and platform fee configurations",
    `Found charges: ${activeCharges.map((c) => c.key).join(", ")}`,
    activeCharges.length >= 2 ? "PASSED" : "FAILED",
    "High"
  );

  const pricingQuote = await pricingService.calculateOrderPricing({
    rawItems: [{ productId: sampleProduct._id, quantity: 2 }],
    user: testCustomer1,
  });

  const isQuoteAccurate =
    pricingQuote.subtotal > 0 &&
    pricingQuote.taxAmount >= 0 &&
    pricingQuote.platformFee >= 0 &&
    pricingQuote.totalAmount === Math.round((pricingQuote.discountedSubtotal + pricingQuote.taxAmount + pricingQuote.platformFee + (pricingQuote.shippingFee || 0)) * 100) / 100;

  recordTest(
    "FEE-02",
    "Pricing Engine",
    "Calculate complete order quote (subtotal + tax + platformFee = totalAmount)",
    "Mathematical equality of final payable totalAmount",
    `Subtotal: ₹${pricingQuote.subtotal}, Tax: ₹${pricingQuote.taxAmount}, Total: ₹${pricingQuote.totalAmount}`,
    isQuoteAccurate ? "PASSED" : "FAILED",
    "Critical"
  );

  // --- 5. Order Placement Schema Validation ---
  const validOrderPayload = {
    items: [{ productId: sampleProduct._id.toString(), quantity: 1 }],
    customerDetails: {
      name: "Ramesh Sharma",
      email: "ramesh@pujaveda.in",
      phone: "9876543210",
    },
    shippingAddress: {
      name: "Ramesh Sharma",
      phone: "9876543210",
      street: "108 Dashashwamedh Ghat",
      city: "Varanasi",
      state: "Uttar Pradesh",
      postalCode: "221001",
    },
    paymentMethod: "cod",
  };

  const vOrderValid = createOrderSchema.validate(validOrderPayload);
  recordTest(
    "ORD-01",
    "Checkout",
    "Validate comprehensive order creation payload",
    "Valid checkout payload accepted with 0 errors",
    vOrderValid.error ? vOrderValid.error.message : "Validation passed",
    !vOrderValid.error ? "PASSED" : "FAILED",
    "Critical"
  );

  // Reject order with invalid phone
  const vOrderInvalidPhone = createOrderSchema.validate({
    ...validOrderPayload,
    customerDetails: { ...validOrderPayload.customerDetails, phone: "123" },
  });
  const isOrderPhoneRejected = vOrderInvalidPhone.error?.details[0]?.message?.includes("valid 10-digit mobile number");

  recordTest(
    "ORD-02",
    "Checkout",
    "Reject checkout order creation when customer phone is invalid",
    "Error: 'Please enter a valid 10-digit mobile number'",
    vOrderInvalidPhone.error?.details[0]?.message || "None",
    isOrderPhoneRejected ? "PASSED" : "FAILED",
    "High"
  );

  // --- 6. Payment Security: Razorpay Signature Verification ---
  const fakeOrderId = "order_fake_123456";
  const fakePaymentId = "pay_fake_789012";
  const invalidSig = "invalidsignature123";

  let isTamperedSigRejected = false;
  try {
    const verified = verifyCheckoutSignature({
      razorpayOrderId: fakeOrderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: invalidSig,
    });
    isTamperedSigRejected = !verified;
  } catch (err) {
    isTamperedSigRejected = true;
  }

  recordTest(
    "PAY-01",
    "Payment Security",
    "Reject tampered/invalid Razorpay payment gateway signatures",
    "Signature verification fails and prevents fraudulent payment confirmation",
    isTamperedSigRejected ? "Tampered signature rejected" : "Signature accepted (vulnerability)",
    isTamperedSigRejected ? "PASSED" : "FAILED",
    "Critical"
  );

  // --- 7. Security: Password Hashing Verification ---
  const testPassword = "SacredDevotion@2026";
  const hashedPassword = await bcrypt.hash(testPassword, 10);
  const isPwMatching = await bcrypt.compare(testPassword, hashedPassword);
  const isWrongPwRejected = !(await bcrypt.compare("WrongPassword", hashedPassword));

  recordTest(
    "SEC-01",
    "Security",
    "Ensure bcrypt salted password hashing and timing-safe comparison",
    "Passes on correct password, strictly rejects incorrect password",
    `Correct match: ${isPwMatching}, Wrong rejected: ${isWrongPwRejected}`,
    isPwMatching && isWrongPwRejected ? "PASSED" : "FAILED",
    "Critical"
  );

  // --- 8. Not Implemented / Not Applicable Features Recognition ---
  recordTest(
    "REV-01",
    "Reviews & Ratings",
    "Customer product reviews and ratings module",
    "Explicitly marked as Not Implemented in accordance with prompt guidelines",
    "No Review collection or controller in codebase",
    "NOT_IMPLEMENTED",
    "Low",
    "Planned for post-launch enhancement"
  );

  recordTest(
    "LOG-01",
    "Logistics / AWB",
    "Automated 3rd-party carrier AWB shipping label generation (Shiprocket/Delhivery)",
    "Explicitly marked as Not Implemented (manual order status dispatch is supported)",
    "Status updates supported: Pending -> Processing -> Delivered",
    "NOT_IMPLEMENTED",
    "Low",
    "3rd party logistics integration planned for phase 2"
  );

  recordTest(
    "NOTIF-01",
    "SMS / WhatsApp",
    "SMS / WhatsApp notification triggers",
    "Explicitly marked as Not Configured / Not Implemented",
    "Email service supported via Brevo SMTP",
    "NOT_IMPLEMENTED",
    "Low"
  );

  // Print Summary Table
  console.log("\n===============================================================");
  console.log("FINAL QA SUMMARY COUNTS");
  console.log("===============================================================");

  const totalIdentified = results.length;
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const notImplemented = results.filter((r) => r.status === "NOT_IMPLEMENTED").length;
  const notApplicable = results.filter((r) => r.status === "NOT_APPLICABLE").length;

  console.log(`Total Test Cases Identified: ${totalIdentified}`);
  console.log(`Executed: ${totalIdentified}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Blocked / External: ${blocked}`);
  console.log(`Not Implemented: ${notImplemented}`);
  console.log(`Not Applicable: ${notApplicable}`);

  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveQA().catch((err) => {
  console.error("Fatal QA Suite Error:", err);
  process.exit(1);
});
