import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";

async function main() {
  await connectDB();
  console.log("=== INSPECTING AND DELETING DUMMY COD DATA ===");

  // 1. Identify all COD orders
  const codOrders = await Order.find({ paymentMethod: "cod" });
  console.log(`Found ${codOrders.length} COD order(s) in MongoDB.`);

  const codOrderIds = codOrders.map((o) => o._id);

  // 2. Identify associated payment records
  const codPayments = await Payment.find({ orderId: { $in: codOrderIds } });
  console.log(`Found ${codPayments.length} payment record(s) exclusively associated with COD orders.`);

  // 3. Check for any payment records that might have gateway "cod"
  const gatewayCodPayments = await Payment.find({ gateway: "cod" });
  console.log(`Found ${gatewayCodPayments.length} payment record(s) with gateway: "cod".`);

  // 4. Perform permanent deletion
  let deletedPaymentsCount = 0;
  if (codOrderIds.length > 0) {
    const payRes = await Payment.deleteMany({ orderId: { $in: codOrderIds } });
    deletedPaymentsCount += payRes.deletedCount;
  }
  if (gatewayCodPayments.length > 0) {
    const gPayRes = await Payment.deleteMany({ gateway: "cod" });
    deletedPaymentsCount += gPayRes.deletedCount;
  }

  const orderRes = await Order.deleteMany({ paymentMethod: "cod" });
  const deletedOrdersCount = orderRes.deletedCount;

  console.log(`\nDeletion Summary:`);
  console.log(`- Permanently deleted COD orders: ${deletedOrdersCount}`);
  console.log(`- Permanently deleted COD payment records: ${deletedPaymentsCount}`);

  // 5. Verification: Ensure no COD records remain
  const remainingCodOrders = await Order.countDocuments({ paymentMethod: "cod" });
  const remainingCodPayments = await Payment.countDocuments({ orderId: { $in: codOrderIds } });
  const totalOrders = await Order.countDocuments();
  const totalPayments = await Payment.countDocuments();

  console.log(`\nVerification:`);
  console.log(`- Remaining COD orders: ${remainingCodOrders} (Must be 0)`);
  console.log(`- Remaining COD payments: ${remainingCodPayments} (Must be 0)`);
  console.log(`- Remaining valid Razorpay/other orders: ${totalOrders}`);
  console.log(`- Remaining valid Razorpay payment records: ${totalPayments}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error deleting COD data:", err);
  process.exit(1);
});

