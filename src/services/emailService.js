import "dotenv/config";
import nodemailer from "nodemailer";

let transporter = null;

/**
 * Helper to retrieve Brevo API key across common naming conventions.
 */
export const getBrevoApiKey = () => {
  return (
    process.env.BREVO_API_KEY ||
    process.env.BREVO_KEY ||
    process.env.BREVO_APIKEY ||
    process.env.SENDINBLUE_API_KEY ||
    process.env.SIB_API_KEY ||
    ""
  ).trim();
};

/**
 * Identify which variable name holds the Brevo API key (for diagnostic reporting without leaking secrets).
 */
export const getBrevoApiKeyVariableName = () => {
  if (process.env.BREVO_API_KEY) return "BREVO_API_KEY";
  if (process.env.BREVO_KEY) return "BREVO_KEY";
  if (process.env.BREVO_APIKEY) return "BREVO_APIKEY";
  if (process.env.SENDINBLUE_API_KEY) return "SENDINBLUE_API_KEY";
  if (process.env.SIB_API_KEY) return "SIB_API_KEY";
  return null;
};

/**
 * Checks if Brevo REST API key is configured.
 */
export const isBrevoApiConfigured = () => {
  const key = getBrevoApiKey();
  return Boolean(key && key.length > 0);
};

/**
 * Sends transactional email via Brevo REST API v3 over HTTPS (port 443).
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * Header: api-key
 */
export const sendViaBrevoApi = async ({ to, subject, text, html, toName }) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is not configured in environment variables. Outbound SMTP is blocked on Render Free; Brevo API is required."
    );
  }

  const senderEmail = process.env.EMAIL_FROM || "kunalrathore@youngdecade.com";
  const senderName = process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Pujaveda";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: to,
        ...(toName ? { name: toName } : {}),
      },
    ],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000), // 15-second timeout
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = responseData.message || responseData.code || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`[Brevo REST API HTTP ${response.status}] ${errorMsg}`);
  }

  return {
    messageId: responseData.messageId,
    response: `201 Brevo REST API accepted (${responseData.messageId})`,
    accepted: [to],
    rejected: [],
    provider: "brevo_rest_api",
    httpStatus: response.status,
  };
};

/**
 * Dedicated Brevo REST API Account & Diagnostic Check (GET https://api.brevo.com/v3/account)
 */
export const checkBrevoAccountDetailed = async () => {
  const apiKey = getBrevoApiKey();
  const varName = getBrevoApiKeyVariableName();
  const senderEmail = process.env.EMAIL_FROM || "not_configured";
  const senderName = process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Pujaveda";

  if (!apiKey) {
    return {
      transport: "brevo_rest_api",
      configured: false,
      status: "missing_api_key",
      message:
        "BREVO_API_KEY is missing from Render environment variables. Outbound SMTP is blocked by Render Free; Brevo REST API is required.",
      variableNameChecked: "BREVO_API_KEY",
      senderEmail,
      senderName,
      actionRequired: "Add BREVO_API_KEY to Render Dashboard > Environment.",
    };
  }

  const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`;

  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        transport: "brevo_rest_api",
        configured: true,
        status: "authenticated",
        httpStatus: res.status,
        variableName: varName,
        apiKeyMasked: maskedKey,
        accountEmail: data.email ? data.email.replace(/^(.{3})(.*)(@.*)$/, "$1***$3") : undefined,
        planType: data.plan?.[0]?.type || "active",
        senderEmail,
        senderName,
        error: null,
      };
    } else {
      return {
        transport: "brevo_rest_api",
        configured: true,
        status: "authentication_failed",
        httpStatus: res.status,
        variableName: varName,
        apiKeyMasked: maskedKey,
        senderEmail,
        senderName,
        error: {
          code: data.code || res.status,
          message: data.message || "Invalid or revoked Brevo API key.",
        },
      };
    }
  } catch (err) {
    return {
      transport: "brevo_rest_api",
      configured: true,
      status: "network_error",
      variableName: varName,
      error: { message: err.message },
    };
  }
};

/**
 * Dedicated legacy SMTP diagnostic check.
 */
export const checkSmtpDetailed = async () => {
  const host = process.env.SMTP_HOST || "not_configured";
  const configuredPort = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const maskedUser = user ? user.replace(/^(.{3})(.*)(@.*)$/, "$1***$3") : "not_configured";

  try {
    const t = getTransporter();
    await t.verify();
    return {
      transport: "smtp",
      connected: true,
      host,
      port: t.options.port,
      mode: t.options.secure ? "SSL" : "STARTTLS",
      user: maskedUser,
      error: null,
    };
  } catch (err) {
    return {
      transport: "smtp",
      connected: false,
      host,
      port: configuredPort,
      user: maskedUser,
      error: {
        message: err.message,
        code: err.code || null,
        note: "Render Free blocks outbound SMTP ports 25, 465, and 587. Please use Brevo REST API over HTTPS port 443.",
      },
    };
  }
};

/**
 * Legacy compatibility alias.
 */
export const verifyEmailServiceDetailed = checkBrevoAccountDetailed;
export const verifySmtpConnectionDetailed = checkSmtpDetailed;

export const verifySmtpConnection = async () => {
  const result = await verifyEmailServiceDetailed();
  return result.connected;
};

/**
 * Unified dispatch function:
 * 1. Prioritizes Brevo REST API over HTTPS (port 443) when BREVO_API_KEY is configured.
 * 2. On Render Free (where SMTP ports are blocked), strictly requires BREVO_API_KEY.
 * 3. Falls back to local SMTP transport only when running in local development without BREVO_API_KEY.
 */
export const sendEmail = async ({ to, subject, text, html, toName }) => {
  // 1. Prioritize Brevo REST API (HTTPS port 443)
  if (isBrevoApiConfigured()) {
    try {
      return await sendViaBrevoApi({ to, subject, text, html, toName });
    } catch (apiErr) {
      console.error("[EmailService] Brevo REST API delivery failed:", apiErr.message);
      // On Render, do not attempt blocked SMTP fallback as it will hang or timeout
      if (process.env.RENDER || process.env.NODE_ENV === "production") {
        throw apiErr;
      }
      console.warn("[EmailService] Falling back to local SMTP transport...");
    }
  }

  // If on Render production without BREVO_API_KEY, fail fast with informative message
  if (process.env.RENDER && !isBrevoApiConfigured()) {
    throw new Error(
      "Render blocks outbound SMTP ports. Please configure BREVO_API_KEY, EMAIL_FROM, and EMAIL_FROM_NAME in Render environment variables to send emails via Brevo REST API."
    );
  }

  // 2. SMTP Transport fallback (for local development)
  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "support.youngdecade@gmail.com";
  const senderName = process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Pujaveda";

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const t = getTransporter();
    return await t.sendMail(mailOptions);
  } catch (err) {
    if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.command === "CONN") {
      console.warn(`[EmailService] SMTP connection on primary port timed out (${err.message}). Retrying via SSL port 465...`);
      const fallbackTransporter = getTransporter(465);
      return await fallbackTransporter.sendMail(mailOptions);
    }
    throw err;
  }
};

