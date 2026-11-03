import "dotenv/config";
import nodemailer from "nodemailer";

let transporter = null;

export const getTransporter = (forcePort = null) => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const configuredPort = Number(process.env.SMTP_PORT || 587);
  // If SMTP_SECURE is 'ssl', standard SMTPS port is 465.
  const port = forcePort || (process.env.SMTP_SECURE === "ssl" ? 465 : configuredPort);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[EmailService] SMTP credentials not configured.");
  }

  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: {
      rejectUnauthorized: true,
    },
  });
};

export const verifySmtpConnection = async () => {
  try {
    const t = getTransporter();
    await t.verify();
    return true;
  } catch (err) {
    if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.command === "CONN") {
      try {
        const fallback = getTransporter(465);
        await fallback.verify();
        return true;
      } catch (fbErr) {
        console.error("[EmailService] Both primary and port 465 failed:", fbErr.message);
        return false;
      }
    }
    console.error("[EmailService] SMTP verification failed:", err.message);
    return false;
  }
};

export const verifySmtpConnectionDetailed = async () => {
  const host = process.env.SMTP_HOST || "not_configured";
  const configuredPort = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const maskedUser = user ? user.replace(/^(.{3})(.*)(@.*)$/, "$1***$3") : "not_configured";
  const emailFrom = process.env.EMAIL_FROM || "";
  const maskedFrom = emailFrom ? emailFrom.replace(/^(.{3})(.*)(@.*)$/, "$1***$3") : "not_configured";

  try {
    const t = getTransporter();
    await t.verify();
    return {
      connected: true,
      host,
      port: t.options.port,
      mode: t.options.secure ? "SSL" : "STARTTLS",
      user: maskedUser,
      from: maskedFrom,
      error: null,
    };
  } catch (err) {
    // If blocked or timed out, test port 465 failover
    if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.command === "CONN") {
      try {
        const fallback = getTransporter(465);
        await fallback.verify();
        return {
          connected: true,
          host,
          port: 465,
          mode: "SSL (failover from blocked port 587)",
          user: maskedUser,
          from: maskedFrom,
          error: null,
          note: `Port ${configuredPort} timed out (blocked by cloud hosting firewall); successfully established connection via SSL port 465.`,
        };
      } catch (fbErr) {
        return {
          connected: false,
          host,
          port: configuredPort,
          user: maskedUser,
          from: maskedFrom,
          error: {
            primaryMessage: err.message,
            primaryCode: err.code || null,
            fallback465Message: fbErr.message,
          },
        };
      }
    }

    return {
      connected: false,
      host,
      port: configuredPort,
      user: maskedUser,
      from: maskedFrom,
      error: {
        message: err.message,
        code: err.code || null,
        response: err.response || null,
        responseCode: err.responseCode || null,
        command: err.command || null,
      },
    };
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
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
    // If primary port (e.g. 587 on Render) timed out or was blocked by firewall, failover to port 465 (SSL)
    if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.command === "CONN") {
      console.warn(`[EmailService] SMTP connection on primary port timed out (${err.message}). Retrying via SSL port 465...`);
      const fallbackTransporter = getTransporter(465);
      return await fallbackTransporter.sendMail(mailOptions);
    }
    throw err;
  }
};

