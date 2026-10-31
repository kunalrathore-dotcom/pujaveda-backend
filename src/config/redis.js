import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

let redisClient = null;
let isRedisConnected = false;

if (redisUrl) {
  try {
    // Strip surrounding quotes if present in .env
    const sanitizedUrl = redisUrl.replace(/^["']|["']$/g, "").trim();

    redisClient = new Redis(sanitizedUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      connectTimeout: 10000,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("[Redis] Connection established successfully to Upstash Redis.");
    });

    redisClient.on("ready", () => {
      isRedisConnected = true;
    });

    redisClient.on("error", (error) => {
      isRedisConnected = false;
      console.error("[Redis] Connection error:", error.message);
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });
  } catch (err) {
    console.error("[Redis] Initialization error:", err.message);
  }
} else {
  console.warn("[Redis] REDIS_URL not configured.");
}

export const isRedisReady = () => isRedisConnected && redisClient?.status === "ready";

export const getRedisStatus = async () => {
  if (!redisClient) return "unconfigured";
  try {
    const pong = await redisClient.ping();
    return pong === "PONG" ? "connected" : "error";
  } catch {
    return "disconnected";
  }
};

export default redisClient;
