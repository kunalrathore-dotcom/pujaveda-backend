import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";

const HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function verifyLoginApi(email, password) {
  const port = process.env.PORT || 5000;
  const url = `http://127.0.0.1:${port}/api/auth/login`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success && data.token) {
      console.log("[createUser] Login API verification succeeded.");
      return;
    }

    console.warn(
      `[createUser] Login API responded with status ${response.status}: ${data.message || "unknown error"}. Local password verification still passed.`
    );
  } catch {
    console.log(
      "[createUser] Backend login API was not reachable. Local password verification against the saved hash succeeded."
    );
  }
}

async function createUser() {
  const name = process.env.USER_NAME?.trim();
  const rawEmail = process.env.USER_EMAIL?.trim();
  const password = process.env.USER_PASSWORD;

  if (!name || !rawEmail || !password) {
    console.error(
      "[createUser] Missing required environment variables. Please ensure USER_NAME, USER_EMAIL, and USER_PASSWORD are set."
    );
    process.exit(1);
  }

  if (name.length < 2 || name.length > 50) {
    console.error("[createUser] USER_NAME must be between 2 and 50 characters.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("[createUser] Password must be at least 8 characters long.");
    process.exit(1);
  }

  const email = rawEmail.toLowerCase();

  try {
    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(
        `[createUser] User account with email "${email}" already exists (current role: "${existingUser.role}"). Skipping creation without modifying the existing account.`
      );
      return;
    }

    // Pass plaintext password so User.pre("save") hashes exactly once, matching registration.
    const created = await User.create({
      name,
      email,
      password,
      role: "user",
      isActive: true,
      phone: "",
      addresses: [],
    });

    const saved = await User.findById(created._id);
    if (!saved) {
      throw new Error("User document was not persisted to MongoDB.");
    }

    if (saved.role !== "user") {
      throw new Error(`Saved user has unexpected role "${saved.role}".`);
    }

    if (!HASH_PATTERN.test(saved.password)) {
      throw new Error("Saved password is not a bcrypt hash.");
    }

    const passwordMatches = await saved.comparePassword(password);
    if (!passwordMatches) {
      throw new Error("Saved password hash does not match the provided password.");
    }

    console.log(
      `[createUser] User account successfully created for "${saved.email}" (ID: ${saved._id}, role: "${saved.role}").`
    );

    await verifyLoginApi(email, password);
  } catch (error) {
    console.error("[createUser] Error creating user:", error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
}

createUser();
