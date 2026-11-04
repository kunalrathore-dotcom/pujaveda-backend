import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

import app from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import { seedDefaultLegalPages } from "./controllers/legalPageController.js";

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Connect to MongoDB Atlas (fails safely if connection cannot be established)
    await connectDB();
    await seedDefaultLegalPages();

    const server = app.listen(PORT, () => {
      console.log(`[Sonic Backend] Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
      console.log(`[Sonic Backend] Health check available at http://localhost:${PORT}/api/health`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `\n[Sonic Backend] Port Conflict Error: Port ${PORT} is already in use by another running process.`
        );
        console.error(
          `[Sonic Backend] An existing instance of the backend is likely already running on port ${PORT}.`
        );
        console.error(
          `[Sonic Backend] Please check active processes on port ${PORT} before attempting to start a duplicate server.`
        );
        process.exit(1);
      } else {
        console.error("[Sonic Backend] Server listen error:", error);
        process.exit(1);
      }
    });

    const handleExit = async (signal) => {
      console.log(`\n[Sonic Backend] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await closeDB();
        console.log("[Sonic Backend] Process terminated.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => handleExit("SIGINT"));
    process.on("SIGTERM", () => handleExit("SIGTERM"));
  } catch (error) {
    console.error("[Sonic Backend] Server startup aborted due to database connection failure.");
    process.exit(1);
  }
};

startServer();
