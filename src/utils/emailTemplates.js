/**
 * Email Templates for Pluxpc
 */

export const getPasswordResetOtpEmail = ({ name = "User", otp, role = "user", expiryMinutes = 10 }) => {
  const isAdmin = role === "admin";
  const portalName = isAdmin ? "Pluxpc Admin Portal" : "Pluxpc";

  const subject = `Your Password Reset OTP - ${portalName}`;
  const text = `Hello ${name},\n\nYour 6-digit one-time password (OTP) for resetting your ${portalName} password is: ${otp}\n\nThis OTP will expire in ${expiryMinutes} minutes. If you did not request this, please ignore this email or contact support.\n\nBest regards,\nPluxpc Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e9ecef; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #111111; padding: 28px; text-align: center; }
          .brand { color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
          .brand span { color: #ff3b55; }
          .badge { display: inline-block; background: ${isAdmin ? "#ff3b55" : "#fff0f2"}; color: ${isAdmin ? "#ffffff" : "#ff3b55"}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; }
          .body { padding: 32px 28px; color: #212529; }
          .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
          .desc { font-size: 14px; line-height: 1.6; color: #495057; margin-bottom: 24px; }
          .otp-card { background: #fdf2f4; border: 1.5px dashed #ff3b55; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #ff3b55; font-family: 'Courier New', Courier, monospace; }
          .expiry { font-size: 12px; color: #868e96; margin-top: 8px; font-weight: 600; }
          .warning { font-size: 12px; color: #868e96; line-height: 1.5; border-top: 1px solid #e9ecef; padding-top: 16px; margin-top: 24px; }
          .footer { background: #f8f9fa; padding: 16px 28px; text-align: center; font-size: 11px; color: #adb5bd; border-top: 1px solid #e9ecef; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">Pluxpc<span>.</span></div>
            <div class="badge">${isAdmin ? "Admin Security" : "Account Verification"}</div>
          </div>
          <div class="body">
            <div class="greeting">Hello, ${name}</div>
            <p class="desc">
              We received a request to reset your password for your <strong>${portalName}</strong> account.
              Use the single-use verification code below to proceed with creating your new password.
            </p>
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Valid for ${expiryMinutes} minutes • Single-use only</div>
            </div>
            <div class="warning">
              If you didn't make this request, someone else may have typed your email address by mistake. Your account is safe and no changes were made.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Pluxpc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
};

