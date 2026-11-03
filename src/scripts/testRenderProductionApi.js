async function testProductionRender() {
  console.log("=== TESTING RENDER PRODUCTION FORGOT-PASSWORD & EMAIL DELIVERY ===");

  const payload = { email: "support.youngdecade@gmail.com" };
  console.log("Posting to https://pujaveda-backend.onrender.com/api/auth/forgot-password...");

  const res = await fetch("https://pujaveda-backend.onrender.com/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const status = res.status;
  const data = await res.json().catch(() => ({}));

  console.log(`HTTP Status: ${status}`);
  console.log("Response Body:", data);

  if (status === 200 && data.success) {
    console.log("SUCCESS! Render backend successfully accepted and delivered the email!");
  } else {
    console.error("FAILURE! Render backend responded with an error:", data);
  }
}

testProductionRender().catch(console.error);

