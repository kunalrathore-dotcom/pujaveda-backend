const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function listUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  users.forEach(u => console.log('User:', u.email, '| Role:', u.role, '| Name:', u.name));
  process.exit(0);
}
listUsers();

