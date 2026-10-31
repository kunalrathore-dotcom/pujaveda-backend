import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";

async function testPassword() {
  await connectDB();
  const user = await User.findOne({ email: process.env.USER_EMAIL }).select("+password");
  if (!user) {
    console.log("User not found!");
  } else {
    console.log("Found user:", user.email);
    console.log("Password hash starts with:", user.password?.substring(0, 7));
    const match = await bcrypt.compare(process.env.USER_PASSWORD, user.password);
    console.log("Does USER_PASSWORD match stored hash?", match);
    const matchMethods = await user.comparePassword(process.env.USER_PASSWORD);
    console.log("user.comparePassword() result:", matchMethods);
  }
  await closeDB();
}

testPassword();

