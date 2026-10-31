import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";

async function testAdminLogin() {
  await connectDB();
  const admin = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() }).select("+password");
  console.log("Admin record:", admin ? { email: admin.email, role: admin.role, hash: admin.password } : "NOT FOUND");
  
  if (admin) {
    const isMatch = await admin.comparePassword(process.env.ADMIN_PASSWORD);
    console.log("Password match with admin.comparePassword():", isMatch);
    const directBcrypt = await bcrypt.compare(process.env.ADMIN_PASSWORD, admin.password);
    console.log("Password match with direct bcrypt.compare():", directBcrypt);
  }

  const user = await User.findOne({ email: process.env.USER_EMAIL.toLowerCase() }).select("+password");
  console.log("User record:", user ? { email: user.email, role: user.role, hash: user.password } : "NOT FOUND");
  if (user) {
    const isMatch = await user.comparePassword(process.env.USER_PASSWORD);
    console.log("Password match with user.comparePassword():", isMatch);
  }

  await closeDB();
}

testAdminLogin();

