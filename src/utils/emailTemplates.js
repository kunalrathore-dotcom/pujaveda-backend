/**
 * Email Templates for Pujaveda
 */

export const getPasswordResetOtpEmail = ({ name = "Devotee", otp, role = "user", expiryMinutes = 10 }) => {
  const isAdmin = role === "admin";
  const portalName = isAdmin ? "Pujaveda Admin Portal" : "Pujaveda Devotee Account";

  const subject = `Your Password Reset Code - ${portalName}`;
  const text = `Namaste ${name},\n\nYour 6-digit verification code to reset your password for ${portalName} is: ${otp}\n\nThis verification code will expire in ${expiryMinutes} minutes. If you did not request a password reset, you can safely ignore this email.\n\nWarm regards,\nThe Pujaveda Team\nhttps://pujaveda.in`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 24px 16px; color: #3D2619; }
          .container { max-width: 520px; margin: 0 auto; background: #FFFDF9; border-radius: 20px; border: 1px solid #EEDBC5; overflow: hidden; box-shadow: 0 8px 24px rgba(92,15,23,0.06); }
          .header { background: #4A0D15; padding: 28px 24px; text-align: center; }
          .brand { color: #FFF8EE; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
          .brand span { color: #DA9B26; }
          .badge { display: inline-block; background: #DA9B26; color: #4A0D15; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; margin-top: 10px; letter-spacing: 0.5px; }
          .body { padding: 32px 28px; }
          .greeting { font-size: 18px; font-weight: 800; color: #4A0D15; margin-bottom: 12px; }
          .desc { font-size: 14px; line-height: 1.6; color: #5C4A3E; margin-bottom: 24px; }
          .otp-card { background: #FAF3E8; border: 1.5px dashed #DA9B26; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #4A0D15; font-family: 'Courier New', Courier, monospace; }
          .expiry { font-size: 12px; color: #8C7667; margin-top: 10px; font-weight: 600; }
          .warning { font-size: 12px; color: #8C7667; line-height: 1.5; border-top: 1px solid #EEDBC5; padding-top: 18px; margin-top: 24px; }
          .footer { background: #F5EDE1; padding: 18px 24px; text-align: center; font-size: 11px; color: #8C7667; border-top: 1px solid #EEDBC5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand">PUJA<span>VEDA</span></h1>
            <div class="badge">${isAdmin ? "Admin Security" : "Devotee Verification"}</div>
          </div>
          <div class="body">
            <div class="greeting">Namaste, ${name}</div>
            <p class="desc">
              We received a request to reset the password for your <strong>${portalName}</strong>.
              Use the single-use 6-digit verification code below to proceed with setting your new password.
            </p>
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Valid for ${expiryMinutes} minutes • Single-use only</div>
            </div>
            <div class="warning">
              If you did not request this password reset, please disregard this email. Your account remains completely safe and no changes have been made.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Pujaveda. Sacred Essentials for Every Devotee.
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
};

export const getOrderConfirmationEmail = ({ order, storefrontUrl = "https://pujaveda.in" }) => {
  const customerName = order.customerDetails?.name || order.shippingAddress?.name || "Devotee";
  const orderNumber = order.orderNumber || "ORD-0000";
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const items = Array.isArray(order.items) ? order.items : [];
  const trackingUrl = `${storefrontUrl.replace(/\/+$/, "")}/orders`;

  const subject = `Order Confirmed: ${orderNumber} - Pujaveda Sacred Essentials`;

  const itemsText = items
    .map((item) => `- ${item.name} (Qty: ${item.quantity}) - ₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}`)
    .join("\n");

  const addressText = `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""} - ${order.shippingAddress?.postalCode || ""}`;

  const text = `Namaste ${customerName},

Thank you for your order with Pujaveda! Your payment has been verified and your sacred order has been confirmed.

Order Summary:
Order Number: ${orderNumber}
Date: ${orderDate}
Payment Method: ${String(order.paymentMethod || "Razorpay").toUpperCase()} (Confirmed & Paid)
Payment Status: ${String(order.paymentStatus || "paid").toUpperCase()}

Items:
${itemsText}

Financial Breakdown:
Subtotal: ₹${Number(order.subtotal || 0).toFixed(2)}
${order.coupon?.discount ? `Discount: -₹${Number(order.coupon.discount).toFixed(2)}\n` : ""}\
Tax: +₹${Number(order.taxAmount || 0).toFixed(2)}
Platform Fee: +₹${Number(order.platformFee || 0).toFixed(2)}
Delivery Charges: ${order.shippingFee > 0 ? `+₹${Number(order.shippingFee).toFixed(2)}` : "FREE"}
Total Paid: ₹${Number(order.totalAmount || 0).toFixed(2)}

Delivery Address:
${customerName}
${addressText}

You can track your order status anytime at: ${trackingUrl}

May your home be blessed with purity, peace, and divine prosperity.

Warm regards,
The Pujaveda Team
care@pujaveda.in`;

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #FAF0E4;">
        <td style="padding: 12px 8px; font-size: 13px; color: #3D2619; font-weight: 600;">
          ${item.name}
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #756255; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #3D2619; text-align: right; font-weight: 700;">
          ₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 24px 16px; color: #3D2619; }
          .container { max-width: 580px; margin: 0 auto; background: #FFFDF9; border-radius: 20px; border: 1px solid #EEDBC5; overflow: hidden; box-shadow: 0 8px 24px rgba(92,15,23,0.06); }
          .header { background: #4A0D15; padding: 28px 24px; text-align: center; }
          .brand { color: #FFF8EE; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
          .brand span { color: #DA9B26; }
          .badge { display: inline-block; background: #2E7D32; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; margin-top: 10px; letter-spacing: 0.5px; }
          .body { padding: 32px 28px; }
          .greeting { font-size: 20px; font-weight: 800; color: #4A0D15; margin-bottom: 8px; }
          .desc { font-size: 14px; line-height: 1.6; color: #5C4A3E; margin-bottom: 24px; }
          .order-card { background: #FAF3E8; border: 1px solid #EEDBC5; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; }
          .order-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .order-table th { text-align: left; padding: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #5C0F17; border-bottom: 1.5px solid #EEDBC5; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .summary-table td { padding: 6px 8px; font-size: 13px; color: #5C4A3E; }
          .summary-table .total-row td { border-top: 2px solid #EEDBC5; padding-top: 10px; font-size: 16px; font-weight: 900; color: #4A0D15; }
          .address-card { background: #FAF6F0; border-radius: 12px; border: 1px solid #EEDBC5; padding: 14px 16px; margin-top: 20px; font-size: 13px; line-height: 1.5; color: #5C4A3E; }
          .cta-btn { display: inline-block; background: #5C0F17; color: #FFFFFF !important; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 9999px; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { background: #F5EDE1; padding: 20px 24px; text-align: center; font-size: 11px; color: #8C7667; border-top: 1px solid #EEDBC5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand">PUJA<span>VEDA</span></h1>
            <div class="badge">Order Confirmed & Payment Received</div>
          </div>
          <div class="body">
            <div class="greeting">Namaste, ${customerName}</div>
            <p class="desc">
              Thank you for choosing Pujaveda for your sacred samagri. Your online payment has been verified via <strong>Razorpay</strong>, and your sacred order has been confirmed. Our team in Varanasi is preparing your package with reverent care.
            </p>

            <!-- Order Meta Pill Box -->
            <div class="order-card">
              <table style="width: 100%; font-size: 12px;">
                <tr>
                  <td style="color: #756255;">Order ID:</td>
                  <td style="text-align: right; font-weight: 800; color: #4A0D15; font-family: monospace; font-size: 13px;">${orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #756255; padding-top: 4px;">Order Date:</td>
                  <td style="text-align: right; font-weight: 600; color: #3D2619; padding-top: 4px;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="color: #756255; padding-top: 4px;">Payment Method:</td>
                  <td style="text-align: right; font-weight: 700; color: #2E7D32; padding-top: 4px; text-transform: uppercase;">Razorpay Secure Online (PAID)</td>
                </tr>
              </table>
            </div>

            <!-- Items Table -->
            <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #4A0D15; margin: 0 0 8px 0;">
              Items in Your Sacred Box
            </h3>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Financial Summary -->
            <table class="summary-table">
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right; font-weight: 600;">₹${Number(order.subtotal || 0).toFixed(2)}</td>
              </tr>
              ${
                order.coupon?.discount
                  ? `<tr>
                      <td style="color: #2E7D32;">Coupon Discount (${order.coupon.code})</td>
                      <td style="text-align: right; font-weight: 700; color: #2E7D32;">-₹${Number(order.coupon.discount).toFixed(2)}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td>Taxes (GST)</td>
                <td style="text-align: right;">+₹${Number(order.taxAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Platform & Handling Charge</td>
                <td style="text-align: right;">+₹${Number(order.platformFee || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Delivery / Shipping Charges</td>
                <td style="text-align: right; font-weight: 600;">${order.shippingFee > 0 ? `+₹${Number(order.shippingFee).toFixed(2)}` : '<span style="color: #2E7D32; font-weight: 800;">FREE</span>'}</td>
              </tr>
              <tr class="total-row">
                <td>Total Paid Amount</td>
                <td style="text-align: right;">₹${Number(order.totalAmount || 0).toFixed(2)}</td>
              </tr>
            </table>

            <!-- Shipping Address -->
            <div class="address-card">
              <strong style="color: #4A0D15; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                Delivery Destination
              </strong>
              <div>${customerName}</div>
              <div>${addressText}</div>
              ${order.customerDetails?.phone ? `<div>Phone: ${order.customerDetails.phone}</div>` : ""}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-top: 24px;">
              <a href="${trackingUrl}" class="cta-btn">
                View & Track Your Order
              </a>
            </div>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Pujaveda. Sacred Essentials for Every Devotee.<br>
            For support or ceremonial inquiries, contact care@pujaveda.in
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
};

