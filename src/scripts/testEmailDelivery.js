import dotenv from "dotenv";
dotenv.config();

import { sendEmail, verifySmtpConnection } from "../services/emailService.js";

async function main() {
  console.log("=== PUJAVEDA SMTP DIAGNOSTIC & VERIFICATION TEST ===");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", process.env.SMTP_PORT);
  console.log("User:", process.env.SMTP_USER);
  console.log("Secure:", process.env.SMTP_SECURE);
  console.log("Email From:", process.env.EMAIL_FROM || "(defaulting to user)");

  const isConnected = await verifySmtpConnection();
  console.log("Connection Verified:", isConnected);

  if (!isConnected) {
    console.error("Cannot proceed: SMTP connection verification failed.");
    process.exit(1);
  }

  const testRecipient = process.env.SMTP_USER || "support.youngdecade@gmail.com";
  console.log(`Sending diagnostic verification email to: ${testRecipient}...`);

  const info = await sendEmail({
    to: testRecipient,
    subject: "Pujaveda Email Service Verification - Test Email",
    text: "Namaste Devotee,\n\nThis is a real-time verification email confirming that the Pujaveda SMTP service is active, authenticated, and successfully delivering emails to recipient inboxes.\n\nWarm regards,\nThe Pujaveda Team",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #EEDBC5; border-radius: 12px; background: #FFFDF9;">
        <h2 style="color: #4A0D15; margin-top: 0;">Pujaveda Email Delivery Verification</h2>
        <p style="color: #3D2619; font-size: 14px; line-height: 1.6;">
          <strong>Namaste!</strong> This email confirms that the updated SMTP service for <strong>Pujaveda</strong> is fully functional and successfully delivering messages.
        </p>
        <div style="background: #FAF3E8; border: 1px dashed #DA9B26; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #4A0D15; font-weight: bold;">Status: DELIVERED & VERIFIED</p>
          <p style="margin: 4px 0 0; color: #5C4A3E; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
        <p style="color: #756255; font-size: 12px; margin-bottom: 0;">
          &copy; ${new Date().getFullYear()} Pujaveda Sacred Essentials. All rights reserved.
        </p>
      </div>
    `,
  });

  console.log("SendMail Result:");
  console.log("- MessageId:", info.messageId);
  console.log("- Response:", info.response);
  console.log("- Accepted:", info.accepted);
  console.log("- Rejected:", info.rejected);

  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
