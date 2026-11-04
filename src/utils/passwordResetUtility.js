import crypto from "crypto";
import redisClient, { isRedisReady } from "../config/redis.js";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const COOLDOWN_SECONDS = 60; // 60 seconds
const MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export const hashSecret = (value) => {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
};

export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const getOtpKey = (role, email) => `sonic:otp:${role}:${email.toLowerCase().trim()}`;
const getCooldownKey = (role, email) => `sonic:cooldown:${role}:${email.toLowerCase().trim()}`;
const getResetTokenKey = (role, tokenHash) => `sonic:reset:${role}:${tokenHash}`;

export const checkRedisHealth = () => {
  if (!redisClient) {
    const error = new Error("Redis is not configured.");
    error.status = 503;
    throw error;
  }
};

export const storeOtp = async ({ role, email, otp }) => {
  checkRedisHealth();

  const otpKey = getOtpKey(role, email);
  const cooldownKey = getCooldownKey(role, email);

  // Check cooldown
  const inCooldown = await redisClient.get(cooldownKey);
  if (inCooldown) {
    const ttl = await redisClient.ttl(cooldownKey);
    const err = new Error(`Please wait ${ttl > 0 ? ttl : 60} seconds before requesting another OTP.`);
    err.status = 429;
    throw err;
  }

  const otpHash = hashSecret(otp);
  const payload = JSON.stringify({
    otpHash,
    attempts: 0,
    createdAt: Date.now(),
  });

  // Multi / transaction to atomically set OTP with TTL and cooldown
  const pipeline = redisClient.pipeline();
  pipeline.set(otpKey, payload, "EX", OTP_TTL_SECONDS);
  pipeline.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS);
  await pipeline.exec();
};

export const clearOtp = async ({ role, email, preserveCooldown = true }) => {
  if (!redisClient) return;
  const otpKey = getOtpKey(role, email);
  try {
    const pipeline = redisClient.pipeline();
    pipeline.del(otpKey);
    if (!preserveCooldown) {
      const cooldownKey = getCooldownKey(role, email);
      pipeline.del(cooldownKey);
    }
    await pipeline.exec();
  } catch (err) {
    console.warn(`[PasswordResetUtility] Error clearing OTP for ${email}:`, err.message);
  }
};

export const verifyOtp = async ({ role, email, otp }) => {
  checkRedisHealth();

  const otpKey = getOtpKey(role, email);
  const data = await redisClient.get(otpKey);

  if (!data) {
    const err = new Error("OTP has expired or is invalid. Please request a new code.");
    err.status = 400;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    await redisClient.del(otpKey);
    const err = new Error("Invalid OTP state. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (parsed.attempts >= MAX_ATTEMPTS) {
    await redisClient.del(otpKey);
    const err = new Error("Maximum verification attempts exceeded. Please request a new OTP.");
    err.status = 429;
    throw err;
  }

  const incomingHash = hashSecret(otp.trim());
  const expectedHash = parsed.otpHash;

  // Safe timing comparison
  const isValid =
    incomingHash.length === expectedHash.length &&
    crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(expectedHash));

  if (!isValid) {
    parsed.attempts += 1;
    const remaining = MAX_ATTEMPTS - parsed.attempts;
    if (remaining <= 0) {
      await redisClient.del(otpKey);
      const err = new Error("Maximum verification attempts exceeded. Please request a new OTP.");
      err.status = 429;
      throw err;
    }

    const ttl = await redisClient.ttl(otpKey);
    if (ttl > 0) {
      await redisClient.set(otpKey, JSON.stringify(parsed), "EX", ttl);
    }
    const err = new Error(`Incorrect OTP. ${remaining} attempt(s) remaining.`);
    err.status = 400;
    throw err;
  }

  // OTP verified successfully: issue single-use reset token and invalidate OTP
  const rawResetToken = generateResetToken();
  const resetTokenHash = hashSecret(rawResetToken);
  const resetKey = getResetTokenKey(role, resetTokenHash);

  const resetPayload = JSON.stringify({
    email: email.toLowerCase().trim(),
    role,
    verifiedAt: Date.now(),
  });

  const pipeline = redisClient.pipeline();
  pipeline.del(otpKey);
  pipeline.set(resetKey, resetPayload, "EX", RESET_TOKEN_TTL_SECONDS);
  await pipeline.exec();

  return rawResetToken;
};

export const consumeResetToken = async ({ role, resetToken }) => {
  checkRedisHealth();

  if (!resetToken) {
    const err = new Error("Reset token is required.");
    err.status = 400;
    throw err;
  }

  const resetTokenHash = hashSecret(resetToken.trim());
  const resetKey = getResetTokenKey(role, resetTokenHash);

  const data = await redisClient.get(resetKey);
  if (!data) {
    const err = new Error("Password reset token is invalid or has expired. Please request a new OTP.");
    err.status = 400;
    throw err;
  }

  // Single-use: delete immediately
  await redisClient.del(resetKey);

  try {
    return JSON.parse(data);
  } catch {
    const err = new Error("Corrupted reset token state.");
    err.status = 400;
    throw err;
  }
};

