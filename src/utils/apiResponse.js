/**
 * Centralized API Response Utility for Sonic E-Commerce
 */

export const successResponse = (
  res,
  { statusCode = 200, message = "Request successful", data = null, ...rest }
) => {
  const payload = {
    success: true,
    message,
    data: data !== undefined ? data : null,
  };

  // If data is an object (not array or null), spread its properties at the root level
  // as well to maintain 100% backward compatibility with existing frontend code.
  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.assign(payload, data);
  }

  if (Object.keys(rest).length > 0) {
    Object.assign(payload, rest);
  }

  return res.status(statusCode).json(payload);
};

export const errorResponse = (
  res,
  { statusCode = 500, message = "Something went wrong", errors = null }
) => {
  const payload = {
    success: false,
    message,
    errors: errors !== undefined ? errors : null,
  };

  return res.status(statusCode).json(payload);
};

export const ok = (res, message = "Request successful", data = null) =>
  successResponse(res, { statusCode: 200, message, data });

export const created = (res, message = "Resource created successfully", data = null) =>
  successResponse(res, { statusCode: 201, message, data });

export const badRequest = (res, message = "Bad request", errors = null) =>
  errorResponse(res, { statusCode: 400, message, errors });

export const unauthorized = (res, message = "Authentication required", errors = null) =>
  errorResponse(res, { statusCode: 401, message, errors });

export const forbidden = (res, message = "Access denied", errors = null) =>
  errorResponse(res, { statusCode: 403, message, errors });

export const notFound = (res, message = "Resource not found", errors = null) =>
  errorResponse(res, { statusCode: 404, message, errors });

export const accountDeactivated = (
  res,
  message = "Your account has been deactivated. Please contact support."
) => errorResponse(res, { statusCode: 403, message });

export const serverError = (res, message = "Internal server error", errors = null) =>
  errorResponse(res, { statusCode: 500, message, errors });

export const serviceUnavailable = (
  res,
  message = "Service temporarily unavailable. Please try again later."
) => errorResponse(res, { statusCode: 503, message });

export const notificationResponse = (res, message, data = null) =>
  successResponse(res, { statusCode: 200, message, data });

