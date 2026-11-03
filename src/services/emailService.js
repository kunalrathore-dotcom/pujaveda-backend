import "dotenv/config";
import nodemailer from "nodemailer";

let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("[EmailService] SMTP credentials not configured.");
    }

    const isExplicitSsl = process.env.SMTP_SECURE === "ssl" || process.env.SMTP_SECURE === "true";
    const secure = port === 465 || (isExplicitSsl && port !== 587);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && (port === 587 || process.env.SMTP_SECURE === "tls" || isExplicitSsl),
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: true,
      },
    });
  }
  return transporter;
};

export const verifySmtpConnection = async () => {
  try {
    const t = getTransporter();
    await t.verify();
    return true;
  } catch (err) {
    console.error("[EmailService] SMTP verification failed:", err.message);
    return false;
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "support.youngdecade@gmail.com";
  const senderName = process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Pujaveda";
  const t = getTransporter();

  return t.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    text,
    html,
  });
};

