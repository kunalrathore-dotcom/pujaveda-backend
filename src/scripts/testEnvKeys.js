import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");

console.log("Resolved envPath:", envPath);
console.log("File exists:", fs.existsSync(envPath));

const res = dotenv.config({ path: envPath });
const parsed = res.parsed || {};
console.log("Keys found:", Object.keys(parsed));
console.log("ADMIN_NAME:", !!parsed.ADMIN_NAME);
console.log("ADMIN_EMAIL:", !!parsed.ADMIN_EMAIL, parsed.ADMIN_EMAIL ? `(${parsed.ADMIN_EMAIL})` : "");
console.log("ADMIN_PASSWORD is set:", !!parsed.ADMIN_PASSWORD, "Length:", parsed.ADMIN_PASSWORD ? parsed.ADMIN_PASSWORD.length : 0);
console.log("USER_NAME:", !!parsed.USER_NAME);
console.log("USER_EMAIL:", !!parsed.USER_EMAIL, parsed.USER_EMAIL ? `(${parsed.USER_EMAIL})` : "");
console.log("USER_PASSWORD is set:", !!parsed.USER_PASSWORD, "Length:", parsed.USER_PASSWORD ? parsed.USER_PASSWORD.length : 0);

