import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import bcrypt from "bcryptjs";
import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";

async function createAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const rawEmail = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !rawEmail || !password) {
    console.error(
      "[createAdmin] Missing required environment variables. Please ensure ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are set."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("[createAdmin] Password must be at least 8 characters long.");
    process.exit(1);
  }

  const email = rawEmail.toLowerCase();

  try {
    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(
        `[createAdmin] Admin account with email "${email}" already exists (current role: "${existingUser.role}"). Skipping creation without modifying existing account.`
      );
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      phone: "",
      addresses: [],
    });

    console.log(
      `[createAdmin] Admin account successfully created for "${admin.email}" (ID: ${admin._id}, role: "${admin.role}").`
    );
  } catch (error) {
    console.error("[createAdmin] Error creating admin:", error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
}

createAdmin();
