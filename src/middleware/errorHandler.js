import multer from "multer";
import { badRequest, notFound, serverError } from "../utils/apiResponse.js";

export const notFoundHandler = (req, res, next) => {
  return notFound(res, `API route not found: ${req.method} ${req.originalUrl}`);
};

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return badRequest(res, "File is too large. Maximum allowed file size is 5MB.");
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return badRequest(res, "Too many files uploaded in a single request. Maximum allowed is 10.");
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return badRequest(res, `Unexpected file field '${err.field}'. Please verify form field names.`);
    }
    return badRequest(res, `Upload error: ${err.message}`);
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    return badRequest(res, "Database validation failed", errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return badRequest(res, `Duplicate value entered for ${field}. Please use another value.`);
  }

  if (err.name === "CastError") {
    return badRequest(res, `Invalid format for identifier: ${err.value}`);
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  return serverError(res, err.message || "An internal server error occurred.", {
    statusCode,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

