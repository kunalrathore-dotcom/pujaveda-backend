import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";

async function inspect() {
  await connectDB();
  console.log("Connected DB name:", mongoose.connection.name);
  console.log("Connected DB host:", mongoose.connection.host);

  const users = await User.find({}).select("+password");
  console.log("Total users in DB:", users.length);
  for (const u of users) {
    console.log(`- User: ${u.email} | Name: ${u.name} | Role: ${u.role} | Active: ${u.isActive} | PwdHashStart: ${u.password?.substring(0, 7)}... | PwdLen: ${u.password?.length}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const userEmail = process.env.USER_EMAIL?.trim()?.toLowerCase();
  console.log(`Looking for ADMIN_EMAIL (${adminEmail}):`, users.some(u => u.email === adminEmail));
  console.log(`Looking for USER_EMAIL (${userEmail}):`, users.some(u => u.email === userEmail));

  await closeDB();
}

inspect();

