import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Banner } from "../models/Banner.js";
import { DivineCard } from "../models/DivineCard.js";
import { FestivalCollection } from "../models/FestivalCollection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the active upload directory:
 * 1. process.env.UPLOAD_DIR (explicit override, e.g. /var/data/uploads)
 * 2. /var/data/uploads (Render Persistent Disk mount path)
 * 3. <project-root>/uploads (local development fallback)
 */
export const getUploadDir = () => {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()) {
    const customDir = path.resolve(process.env.UPLOAD_DIR.trim());
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch (err) {
        console.warn(`[StorageService] Could not create UPLOAD_DIR (${customDir}):`, err.message);
      }
    }
    return customDir;
  }

  // Check if Render persistent disk is mounted at /var/data
  if (fs.existsSync("/var/data")) {
    const persistentDir = "/var/data/uploads";
    if (!fs.existsSync(persistentDir)) {
      try {
        fs.mkdirSync(persistentDir, { recursive: true });
        return persistentDir;
      } catch (err) {
        console.warn(`[StorageService] Could not create /var/data/uploads:`, err.message);
      }
    } else {
      return persistentDir;
    }
  }

  // Local development default: backend/uploads
  const localDir = path.resolve(__dirname, "../../uploads");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
};

/**
 * Resolves the public base URL of the backend.
 * In production, defaults to the deployed Render URL (never localhost).
 */
export const getPublicBaseUrl = (req) => {
  const envUrl = process.env.BACKEND_URL || process.env.PUBLIC_BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://pujaveda-backend.onrender.com";
  }

  if (req) {
    const isHttps = req.protocol === "https" || req.headers?.["x-forwarded-proto"] === "https";
    const protocol = isHttps ? "https" : "http";
    const host = req.get ? req.get("host") : null;
    if (host) {
      return `${protocol}://${host}`.replace(/\/+$/, "");
    }
  }

  const port = process.env.PORT || 5001;
  return `http://localhost:${port}`;
};

/**
 * Generates the full public URL for an uploaded file.
 * Handles existing full external URLs (Unsplash, etc.), relative paths, and bare filenames.
 */
export const getPublicImageUrl = (filename, req) => {
  if (!filename || typeof filename !== "string") return "";

  const trimmed = filename.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // If it's a legacy localhost URL in a production environment, normalize it to the public backend URL
    if (
      process.env.NODE_ENV === "production" &&
      (trimmed.includes("localhost:5000/uploads/") || trimmed.includes("localhost:5001/uploads/") || trimmed.includes("localhost:10000/uploads/") || trimmed.includes("127.0.0.1:5000/uploads/") || trimmed.includes("127.0.0.1:5001/uploads/"))
    ) {
      const cleanName = path.basename(trimmed.split("?")[0]);
      return `${getPublicBaseUrl(req)}/uploads/${cleanName}`;
    }
    return trimmed;
  }

  const cleanFilename = path.basename(trimmed.split("?")[0]);
  const baseUrl = getPublicBaseUrl(req);
  return `${baseUrl}/uploads/${cleanFilename}`;
};

/**
 * Validates image binary magic bytes (JPEG, PNG, WebP) to confirm authentic image content.
 */
export const validateImageSignature = (buffer) => {
  if (!buffer || buffer.length < 8) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isJpeg || isPng || isWebp;
};

/**
 * Checks whether a given image filename is currently referenced in any active database records.
 * Prevents deleting files that are still assigned to existing products, categories, or banners.
 */
export const isImageReferencedInDatabase = async (filename) => {
  if (!filename || typeof filename !== "string") return false;
  const cleanName = path.basename(filename.split("?")[0]);
  if (!cleanName || cleanName === "." || cleanName === "/") return false;

  try {
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [inProduct, inCategory, inBanner, inDivine, inFestival] = await Promise.all([
      Product.exists({
        $or: [{ images: regex }, { primaryImage: regex }, { imageIds: cleanName }],
      }),
      Category.exists({
        $or: [{ image: regex }, { imageId: cleanName }],
      }),
      Banner.exists({
        $or: [
          { imageUrl: regex },
          { mobileImageUrl: regex },
          { imageId: cleanName },
          { mobileImageId: cleanName },
        ],
      }),
      DivineCard?.exists
        ? DivineCard.exists({
            $or: [{ imageUrl: regex }, { imageId: cleanName }],
          })
        : Promise.resolve(null),
      FestivalCollection?.exists
        ? FestivalCollection.exists({
            $or: [{ imageUrl: regex }, { imageId: cleanName }],
          })
        : Promise.resolve(null),
    ]);

    return Boolean(inProduct || inCategory || inBanner || inDivine || inFestival);
  } catch (err) {
    console.warn(`[StorageService] Reference check failed for ${cleanName}:`, err.message);
    return true; // Safety default: preserve file if reference query fails
  }
};

export const storageService = {
  getUploadDir,
  getPublicBaseUrl,
  getPublicImageUrl,
  validateImageSignature,
  isImageReferencedInDatabase,

  /**
   * Saves an image buffer to the active upload directory using native filesystem.
   * Generates a collision-resistant unique name and validates magic bytes.
   */
  async saveImage({ buffer, originalname, mimetype, folder = "general", req }) {
    if (!validateImageSignature(buffer)) {
      throw new Error(
        "Invalid image content or corrupted file signature. Only authentic JPEG, PNG, and WebP images are allowed."
      );
    }

    const uploadDir = getUploadDir();
    const sanitizedFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, "") || "general";
    const rawExt = path.extname(originalname || "").toLowerCase();
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = validExts.includes(rawExt)
      ? rawExt
      : mimetype === "image/png"
      ? ".png"
      : mimetype === "image/webp"
      ? ".webp"
      : ".jpg";

    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const uniqueName = `pujaveda-${sanitizedFolder}-${timestamp}-${random}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = getPublicImageUrl(uniqueName, req);

    return {
      url: publicUrl,
      publicId: uniqueName,
      filename: uniqueName,
      size: buffer.length,
      provider: "local",
    };
  },

  /**
   * Safely deletes an image file from disk only if it is not referenced elsewhere.
   */
  async deleteImage(publicId) {
    if (!publicId || typeof publicId !== "string") return;

    // External third-party URLs (e.g. Unsplash) do not live on local disk
    if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
      const baseUrl = getPublicBaseUrl();
      if (!publicId.startsWith(baseUrl) && !publicId.includes("/uploads/")) {
        return;
      }
    }

    const cleanName = path.basename(publicId.split("?")[0]);
    if (!cleanName || cleanName === "." || cleanName === "/") return;

    try {
      const inUse = await isImageReferencedInDatabase(cleanName);
      if (inUse) {
        console.log(`[StorageService] Skipping deletion of ${cleanName}: file is still referenced in database.`);
        return;
      }

      const uploadDir = getUploadDir();
      const filePath = path.join(uploadDir, cleanName);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[StorageService] Deleted orphaned image: ${cleanName}`);
      }
    } catch (err) {
      console.warn(`[StorageService] Failed to delete file ${cleanName}:`, err.message);
    }
  },
};
