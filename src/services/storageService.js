import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Magic bytes validation for image headers
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

  // WebP: RIFF ... WEBP (0-3: 52 49 46 46, 8-11: 57 45 42 50)
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

export const storageService = {
  async saveImage({ buffer, originalname, mimetype, folder = "general" }) {
    if (!validateImageSignature(buffer)) {
      throw new Error(
        "Invalid image content or corrupted file signature. Only authentic JPEG, PNG, and WebP images are allowed."
      );
    }

    if (isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `sonic/${folder}`,
            resource_type: "image",
          },
          (error, result) => {
            if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              provider: "cloudinary",
            });
          }
        );
        uploadStream.end(buffer);
      });
    }

    // Local persistent storage
    const ext = path.extname(originalname) || (mimetype === "image/png" ? ".png" : mimetype === "image/webp" ? ".webp" : ".jpg");
    const uniqueName = `sonic-${folder}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const port = process.env.PORT || 5000;
    const url = `http://localhost:${port}/uploads/${uniqueName}`;

    return {
      url,
      publicId: uniqueName,
      provider: "local",
    };
  },

  async deleteImage(publicId) {
    if (!publicId) return;

    if (isCloudinaryConfigured() && publicId.includes("/")) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn(`[Storage] Failed to delete Cloudinary asset ${publicId}:`, err.message);
      }
      return;
    }

    // Local file cleanup
    try {
      const filePath = path.join(UPLOADS_DIR, path.basename(publicId));
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.warn(`[Storage] Failed to delete local file ${publicId}:`, err.message);
    }
  },
};

