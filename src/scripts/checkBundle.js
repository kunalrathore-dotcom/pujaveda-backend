async function main() {
  const res = await fetch("https://pujaveda-user-frontend.vercel.app/assets/index-CvsHjCr7.js");
  const code = await res.text();

  const idx = code.indexOf("Razorpay Secure Online Checkout");
  const snippet = code.substring(idx - 200, idx + 100);
  console.log("Snippet:", snippet);

  const idx2 = code.indexOf("Dr=");
  if (idx2 !== -1) {
    console.log("Dr:", code.substring(idx2 - 10, idx2 + 100));
  }
}

main().catch(console.error);
