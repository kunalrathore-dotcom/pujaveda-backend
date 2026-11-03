import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Product } from "../models/Product.js";
import { sendEmail, verifySmtpConnection } from "../services/emailService.js";
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  consumeResetToken,
  hashSecret,
} from "../utils/passwordResetUtility.js";
import { getPasswordResetOtpEmail, getOrderConfirmationEmail } from "../utils/emailTemplates.js";
import { confirmCapturedPayment } from "../utils/paymentUtility.js";

async function runEndToEndEmailAudit() {
  console.log("===============================================================");
  console.log("        PUJAVEDA COMPREHENSIVE EMAIL DELIVERY AUDIT            ");
  console.log("===============================================================");

  await connectDB();

  // -----------------------------------------------------------------
  // 1. SMTP Configuration & Connectivity Verification
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 1] SMTP Infrastructure Verification ---");
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const secure = process.env.SMTP_SECURE;
  const emailFrom = process.env.EMAIL_FROM || user;

  console.log(`- SMTP Host: ${host}`);
  console.log(`- SMTP Port: ${port}`);
  console.log(`- Authenticated User: ${user}`);
  console.log(`- Sender From: ${emailFrom}`);
  console.log(`- TLS/SSL Configuration: ${secure}`);

  const isSmtpVerified = await verifySmtpConnection();
  console.log(`- SMTP Handshake & Authentication: ${isSmtpVerified ? "PASSED (250 OK)" : "FAILED"}`);

  if (!isSmtpVerified) {
    throw new Error("SMTP authentication failed. Check credentials.");
  }

  // -----------------------------------------------------------------
  // 2. Setup / Ensure Designated Test Devotee Account
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 2] Designated Test Devotee Setup ---");
  const testEmail = process.env.SMTP_USER || "support.youngdecade@gmail.com";
  let testUser = await User.findOne({ email: testEmail });

  const initialPassword = "PujavedaTestPassword@2026!";
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(initialPassword, salt);

  if (!testUser) {
    testUser = await User.create({
      name: "Pujaveda Test Devotee",
      email: testEmail,
      password: passwordHash,
      role: "user",
      phone: "9876543210",
      isEmailVerified: true,
      isActive: true,
    });
    console.log(`- Created designated test user: ${testEmail}`);
  } else {
    testUser.password = passwordHash;
    testUser.isActive = true;
    await testUser.save();
    console.log(`- Updated designated test user password: ${testEmail}`);
  }

  // -----------------------------------------------------------------
  // 3. Test Forgot Password Flow & Real Email Delivery
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 3] Forgot Password OTP & Email Verification ---");
  const otp = generateOtp();

  // Clean any existing cooldown for this test run
  await redisClient.del(`sonic:cooldown:user:${testEmail}`);
  await redisClient.del(`sonic:otp:user:${testEmail}`);

  // Store OTP in Redis
  await storeOtp({ role: "user", email: testEmail, otp });
  console.log("- OTP generated and securely hashed in Redis.");

  // Generate Email Content
  const otpEmail = getPasswordResetOtpEmail({
    name: testUser.name,
    otp,
    role: "user",
    expiryMinutes: 10,
  });

  // Send real email via SMTP
  console.log(`- Sending OTP email to designated inbox: ${testEmail}...`);
  const otpSendInfo = await sendEmail({
    to: testEmail,
    subject: otpEmail.subject,
    text: otpEmail.text,
    html: otpEmail.html,
  });

  console.log(`- OTP Email Sent successfully!`);
  console.log(`  Message ID: ${otpSendInfo.messageId}`);
  console.log(`  Server Response: ${otpSendInfo.response}`);
  console.log(`  Accepted Recipients: ${JSON.stringify(otpSendInfo.accepted)}`);

  // Verify OTP Verification logic
  console.log("- Testing OTP verification...");
  const resetToken = await verifyOtp({
    role: "user",
    email: testEmail,
    otp,
  });
  console.log("- OTP verified successfully! Received one-time reset token.");

  // Test Password Reset
  console.log("- Testing password reset with one-time reset token...");
  const newPassword = "NewVedicPujavedaSecurePass#2026";
  const tokenData = await consumeResetToken({
    role: "user",
    resetToken,
  });

  const userToUpdate = await User.findOne({ email: tokenData.email, role: tokenData.role });
  userToUpdate.password = newPassword;
  await userToUpdate.save();
  console.log("- Password reset saved in MongoDB successfully.");

  // Verify Login with new password
  const verifyUser = await User.findOne({ email: testEmail });
  const isMatch = await bcrypt.compare(newPassword, verifyUser.password);
  console.log(`- Login verification with newly reset password: ${isMatch ? "PASSED" : "FAILED"}`);

  // -----------------------------------------------------------------
  // 4. Test Order Confirmation Email (Razorpay Test Mode)
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 4] Paid Order Confirmation Email Verification ---");

  // Find a product to build a realistic test order
  const product = await Product.findOne({ isActive: true }) || {
    _id: new mongoose.Types.ObjectId(),
    name: "Pure Brass Puja Diya (Handcrafted)",
    price: 499,
  };

  const testOrderNumber = `TEST-${Date.now().toString().slice(-6)}`;
  const gatewayOrderId = `order_test_${Date.now()}`;
  const gatewayPaymentId = `pay_test_${Date.now()}`;

  const testOrder = await Order.create({
    orderNumber: testOrderNumber,
    user: testUser._id,
    customerDetails: {
      name: testUser.name,
      email: testUser.email,
      phone: "9876543210",
    },
    shippingAddress: {
      name: testUser.name,
      street: "108 Temple Road, Sacred Enclave",
      city: "Varanasi",
      state: "Uttar Pradesh",
      postalCode: "221001",
      country: "India",
    },
    items: [
      {
        product: product._id,
        name: product.name,
        price: product.price || 499,
        quantity: 2,
        subtotal: (product.price || 499) * 2,
      },
    ],
    subtotal: (product.price || 499) * 2,
    taxAmount: 49.9,
    platformFee: 15.0,
    shippingFee: 0,
    totalAmount: (product.price || 499) * 2 + 64.9,
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    orderStatus: "Pending",
  });

  const testPayment = await Payment.create({
    orderId: testOrder._id,
    userId: testUser._id,
    gateway: "razorpay",
    gatewayOrderId,
    amount: testOrder.totalAmount,
    currency: "INR",
    status: "created",
  });

  console.log(`- Created pending test order: ${testOrderNumber} (Total: ₹${testOrder.totalAmount})`);

  // Simulate Payment Capture via confirmCapturedPayment
  console.log("- Triggering payment confirmation & email dispatcher...");
  const captureResult = await confirmCapturedPayment({
    gatewayOrderId,
    gatewayPaymentId,
  });

  console.log(`- confirmCapturedPayment outcome: ${captureResult.outcome}`);

  // Reload order to inspect emailNotification tracking
  const updatedOrder = await Order.findById(testOrder._id);
  console.log("- Order Payment Status:", updatedOrder.paymentStatus);
  console.log("- Order Email Notification Record:");
  console.log(`  Sent: ${updatedOrder.emailNotification?.sent}`);
  console.log(`  Sent At: ${updatedOrder.emailNotification?.sentAt}`);
  console.log(`  Recipient: ${updatedOrder.emailNotification?.recipientEmail}`);
  console.log(`  Attempts: ${updatedOrder.emailNotification?.attempts}`);
  console.log(`  Last Error: ${updatedOrder.emailNotification?.lastError || "None"}`);

  // -----------------------------------------------------------------
  // 5. Test Idempotency (Prevent Duplicate Confirmation Emails)
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 5] Email Idempotency & Duplicate Prevention Test ---");
  const previousSentAt = updatedOrder.emailNotification?.sentAt;
  const previousAttempts = updatedOrder.emailNotification?.attempts;

  // Re-run confirmation as if webhook and checkout verification both fired
  const duplicateResult = await confirmCapturedPayment({
    gatewayOrderId,
    gatewayPaymentId,
  });

  const reloadedOrder = await Order.findById(testOrder._id);
  const isDuplicatePrevented =
    duplicateResult.outcome === "already_processed" &&
    reloadedOrder.emailNotification?.attempts === previousAttempts &&
    reloadedOrder.emailNotification?.sentAt.getTime() === previousSentAt.getTime();

  console.log(`- Duplicate payment call handled with outcome: ${duplicateResult.outcome}`);
  console.log(`- Duplicate Email Prevented: ${isDuplicatePrevented ? "PASSED (Zero duplicate emails sent)" : "FAILED"}`);

  // -----------------------------------------------------------------
  // 6. Test Failure Handling (Non-blocking order status on email fail)
  // -----------------------------------------------------------------
  console.log("\n--- [STEP 6] Email Failure Resilience Test ---");
  const failOrderNumber = `FAIL-${Date.now().toString().slice(-6)}`;
  const failGatewayOrderId = `order_fail_${Date.now()}`;
  const failGatewayPaymentId = `pay_fail_${Date.now()}`;

  const failOrder = await Order.create({
    orderNumber: failOrderNumber,
    user: testUser._id,
    customerDetails: {
      name: "Devotee with unreachable domain",
      email: "invalid-devotee-address@nonexistentdomain999888777.org",
      phone: "9876543210",
    },
    shippingAddress: {
      name: "Devotee",
      street: "123 Ganga Ghat",
      city: "Haridwar",
      state: "Uttarakhand",
      postalCode: "249401",
      country: "India",
    },
    items: [
      {
        product: product._id,
        name: product.name,
        price: 299,
        quantity: 1,
        subtotal: 299,
      },
    ],
    subtotal: 299,
    totalAmount: 299,
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    orderStatus: "Pending",
  });

  await Payment.create({
    orderId: failOrder._id,
    userId: testUser._id,
    gateway: "razorpay",
    gatewayOrderId: failGatewayOrderId,
    amount: failOrder.totalAmount,
    currency: "INR",
    status: "created",
  });

  const failCaptureResult = await confirmCapturedPayment({
    gatewayOrderId: failGatewayOrderId,
    gatewayPaymentId: failGatewayPaymentId,
  });

  const reloadedFailOrder = await Order.findById(failOrder._id);
  console.log(`- Order Status after payment capture: ${reloadedFailOrder.paymentStatus}`);
  console.log(`- Email Notification Sent Status: ${reloadedFailOrder.emailNotification?.sent}`);
  console.log(`- Email Notification Attempts: ${reloadedFailOrder.emailNotification?.attempts}`);
  console.log(`- Order Payment Maintained: ${reloadedFailOrder.paymentStatus === "paid" ? "PASSED (Payment not cancelled)" : "FAILED"}`);

  // Clean up test orders to keep database pristine
  await Order.deleteMany({ _id: { $in: [testOrder._id, failOrder._id] } });
  await Payment.deleteMany({ orderId: { $in: [testOrder._id, failOrder._id] } });
  console.log("- Cleaned up temporary test orders from MongoDB.");

  console.log("\n===============================================================");
  console.log("             ALL EMAIL AUDIT CHECKS COMPLETED                  ");
  console.log("===============================================================");

  await closeDB();
  process.exit(0);
}

runEndToEndEmailAudit().catch(async (err) => {
  console.error("\nFATAL ERROR DURING EMAIL AUDIT:", err);
  await closeDB().catch(() => {});
  process.exit(1);
});
