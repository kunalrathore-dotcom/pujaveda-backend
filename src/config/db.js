import mongoose from "mongoose";
import dns from "dns";

/**
 * Ensures reliable DNS servers are available for SRV queries.
 * On Windows, Node.js c-ares often defaults to ['127.0.0.1'] when network adapters
 * use IPv6 or non-standard router DNS, causing `querySrv ECONNREFUSED`.
 */
const ensureDnsServers = () => {
  try {
    const servers = dns.getServers();
    if (!servers || servers.length === 0 || (servers.length === 1 && servers[0] === "127.0.0.1")) {
      console.log("[MongoDB] Local DNS loopback detected. Configuring reliable DNS fallbacks (8.8.8.8, 1.1.1.1)...");
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
  } catch (err) {
    console.warn("[MongoDB] DNS server check warning:", err.message);
  }
};

/**
 * Masks username and password in a MongoDB connection string to safely log the target.
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") return "";
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
};

export const connectDB = async () => {
  ensureDnsServers();
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("<MY_ROTATED_MONGODB_ATLAS_CONNECTION_URI>")) {
    console.error("\n========================================================");
    console.error("[MongoDB Atlas] CRITICAL CONFIGURATION ERROR:");
    console.error("MONGODB_URI is not properly configured in backend/.env.");
    console.error("Please configure your MongoDB Atlas connection URI in backend/.env:");
    console.error("MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority");
    console.error("========================================================\n");
    throw new Error(
      "MONGODB_URI is not set or contains placeholder in backend/.env. Please set your MongoDB Atlas connection string."
    );
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  if (process.env.MONGODB_DB_NAME) {
    options.dbName = process.env.MONGODB_DB_NAME;
  }

  try {
    console.log(`[MongoDB] Connecting to database at: ${maskMongoUri(uri)}...`);
    await mongoose.connect(uri, options);
    console.log(
      `[MongoDB] Connected successfully to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`
    );
  } catch (error) {
    if (error.message && (error.message.includes("querySrv") || error.code === "ECONNREFUSED")) {
      console.warn("[MongoDB] querySrv failure detected. Retrying with Google & Cloudflare DNS (8.8.8.8, 1.1.1.1)...");
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(uri, options);
        console.log(
          `[MongoDB] Connected successfully on retry to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`
        );
        return;
      } catch (retryErr) {
        error = retryErr;
      }
    }
    console.error("\n========================================================");
    console.error("[MongoDB] CONNECTION FAILED:");
    console.error(`Target: ${maskMongoUri(uri)}`);
    console.error(`Error: ${error.message}`);
    console.error("Please check: network connection, Atlas IP whitelist (Network Access), and database credentials.");
    console.error("========================================================\n");
    throw error;
  }
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[MongoDB] Connection closed.");
  }
};
