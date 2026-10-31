import mongoose from "mongoose";

/**
 * Masks username and password in a MongoDB connection string to safely log the target.
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") return "";
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
};

export const connectDB = async () => {
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
