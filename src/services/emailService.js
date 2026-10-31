import "dotenv/config";
import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("[EmailService] SMTP credentials not configured.");
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // false for 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
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
  const from = process.env.EMAIL_FROM || "kunalrathore@youngdecade.com";
  const t = getTransporter();

  return t.sendMail({
    from: `"Pluxpc Support" <${from}>`,
    to,
    subject,
    text,
    html,
  });
};

