const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = ['users', 'orders', 'payments', 'coupons', 'pricingcharges', 'auditlogs', 'categories', 'products'];
  for (const c of collections) {
    const count = await mongoose.connection.collection(c).countDocuments({});
    console.log(`${c} count: ${count}`);
  }
  process.exit(0);
}
verify().catch(console.error);
