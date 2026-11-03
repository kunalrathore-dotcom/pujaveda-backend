import { LegalPage } from "../models/LegalPage.js";
import { ok, notFound, badRequest, serverError } from "../utils/apiResponse.js";
import { sanitizeArticleHtml } from "../utils/sanitizeHtml.js";

const DEFAULT_TERMS = `
<h2>1. Introduction & Acceptance of Terms</h2>
<p>Welcome to <strong>Pujaveda</strong> ("we", "our", or "us"). By accessing or using our platform, online store, and services, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to all terms, please refrain from using our website.</p>

<h2>2. Sacred Goods & Product Authenticity</h2>
<p>Pujaveda specializes in authentic Vedic puja samagri, brass idols, sacred ceremonial kits, and spiritual lifestyle essentials. All products are sourced with reverent care and dispatched in pure condition. Product images are representative of genuine artisanal items; slight variations in color or brass patina may naturally occur.</p>

<h2>3. Orders, Pricing & Payment</h2>
<p>All prices displayed on our website are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. We accept online payments securely processed via <strong>Razorpay</strong> (UPI, Credit/Debit Cards, NetBanking). We do not accept Cash on Delivery (COD).</p>

<h2>4. Shipping, Sacred Delivery & Inspection</h2>
<p>We deliver across serviceable postal codes in India. Standard delivery typically takes 3 to 7 business days depending on location. Devotees are encouraged to inspect packaging upon arrival and notify customer support immediately in case of transit damage.</p>

<h2>5. Cancellation & Replacement Policy</h2>
<p>Orders may be cancelled before dispatch from our sacred supply center. Given the sacred nature of puja samagri and ceremonial items, items that have been unsealed or used cannot be returned for ritual purity reasons, unless received in damaged condition.</p>

<h2>6. Contact Devotee Care</h2>
<p>If you have questions regarding our Terms and Conditions, please reach out to our team at <strong>care@pujaveda.in</strong> or through our Pandit helpline.</p>
`.trim();

const DEFAULT_PRIVACY = `
<h2>1. Commitment to Devotee Privacy</h2>
<p>At <strong>Pujaveda</strong>, we hold your personal trust sacred. This Privacy Policy outlines how we collect, handle, protect, and use your personal information when you interact with our platform.</p>

<h2>2. Information We Collect</h2>
<p>We collect essential information required to fulfill your sacred orders and support your devotee experience:</p>
<ul>
  <li><strong>Contact Details:</strong> Name, email address, and phone number for order confirmations and OTP verification.</li>
  <li><strong>Delivery Information:</strong> Shipping street address, city, state, and 6-digit postal code.</li>
  <li><strong>Payment Metadata:</strong> Transaction reference IDs and payment status processed securely through Razorpay. We do not store credit card numbers, CVVs, or bank PINs on our servers.</li>
</ul>

<h2>3. How Your Information Is Used</h2>
<p>Your details are used strictly to:</p>
<ul>
  <li>Process, pack, and deliver your puja essentials accurately.</li>
  <li>Send timely order status updates and OTP verification codes.</li>
  <li>Provide customer care, pandit consultations, and resolve inquiries.</li>
  <li>Enhance website performance and devotee store experience.</li>
</ul>

<h2>4. Data Security & Storage</h2>
<p>We implement enterprise-grade security protocols, encryption in transit (HTTPS/TLS), and restricted access controls to safeguard your personal data from unauthorized access or disclosure.</p>

<h2>5. Third-Party Services</h2>
<p>We do not sell, rent, or trade your personal information. Trusted third-party service providers (such as Razorpay for secure payments and logistical delivery partners) receive only the minimum information necessary to execute their services.</p>

<h2>6. Your Rights & Inquiries</h2>
<p>You may view, update, or request correction of your profile information at any time from your Account Profile page or by contacting <strong>care@pujaveda.in</strong>.</p>
`.trim();

export const seedDefaultLegalPages = async () => {
  try {
    const terms = await LegalPage.findOne({ slug: "terms-and-conditions" });
    if (!terms) {
      await LegalPage.create({
        slug: "terms-and-conditions",
        title: "Terms and Conditions",
        content: DEFAULT_TERMS,
        isPublished: false,
        publishedAt: null,
      });
      console.log("[LegalPages] Seeded default Terms & Conditions (Draft).");
    }

    const privacy = await LegalPage.findOne({ slug: "privacy-policy" });
    if (!privacy) {
      await LegalPage.create({
        slug: "privacy-policy",
        title: "Privacy Policy",
        content: DEFAULT_PRIVACY,
        isPublished: false,
        publishedAt: null,
      });
      console.log("[LegalPages] Seeded default Privacy Policy (Draft).");
    }
  } catch (err) {
    console.warn("[LegalPages] Seed check error:", err.message);
  }
};

/**
 * Public: Get published legal page by slug
 * Returns 404 if draft or unpublished
 */
export const getPublicLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!["terms-and-conditions", "privacy-policy"].includes(slug)) {
      return notFound(res, "Legal page not found.");
    }

    const page = await LegalPage.findOne({ slug, isPublished: true });
    if (!page) {
      return notFound(res, "This legal page is currently not available or is under editorial review.");
    }

    return ok(res, "Legal page retrieved.", { page });
  } catch (error) {
    console.error("[LegalPageController] getPublicLegalPage error:", error);
    return serverError(res, "Failed to retrieve legal page.");
  }
};

/**
 * Admin: Get all legal pages (published and drafts)
 */
export const getAdminLegalPages = async (req, res) => {
  try {
    const pages = await LegalPage.find({}).sort({ slug: 1 });
    return ok(res, "Legal pages retrieved.", { pages });
  } catch (error) {
    console.error("[LegalPageController] getAdminLegalPages error:", error);
    return serverError(res, "Failed to retrieve admin legal pages.");
  }
};

/**
 * Admin: Get specific legal page by slug for editing
 */
export const getAdminLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!["terms-and-conditions", "privacy-policy"].includes(slug)) {
      return badRequest(res, "Invalid legal page identifier.");
    }

    let page = await LegalPage.findOne({ slug });
    if (!page) {
      // Create stub if missing
      const defaultTitle = slug === "terms-and-conditions" ? "Terms and Conditions" : "Privacy Policy";
      const defaultContent = slug === "terms-and-conditions" ? DEFAULT_TERMS : DEFAULT_PRIVACY;
      page = await LegalPage.create({
        slug,
        title: defaultTitle,
        content: defaultContent,
        isPublished: false,
        publishedAt: null,
        updatedBy: req.user?._id,
      });
    }

    return ok(res, "Admin legal page retrieved.", { page });
  } catch (error) {
    console.error("[LegalPageController] getAdminLegalPage error:", error);
    return serverError(res, "Failed to retrieve legal page.");
  }
};

/**
 * Admin: Update legal page content, title, and publication status
 */
export const updateLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, isPublished } = req.body;

    if (!["terms-and-conditions", "privacy-policy"].includes(slug)) {
      return badRequest(res, "Invalid legal page identifier.");
    }

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return badRequest(res, "Page title is required and must contain at least 2 characters.");
    }

    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return badRequest(res, "Page content is required and must contain at least 10 characters.");
    }

    // Sanitize rich-text content to prevent stored XSS
    const sanitizedContent = sanitizeArticleHtml(content);

    let page = await LegalPage.findOne({ slug });
    const isNowPublished = Boolean(isPublished);

    if (!page) {
      page = new LegalPage({
        slug,
        title: title.trim(),
        content: sanitizedContent,
        isPublished: isNowPublished,
        publishedAt: isNowPublished ? new Date() : null,
        updatedBy: req.user?._id,
      });
    } else {
      page.title = title.trim();
      page.content = sanitizedContent;
      page.isPublished = isNowPublished;
      if (isNowPublished && !page.publishedAt) {
        page.publishedAt = new Date();
      }
      page.updatedBy = req.user?._id;
    }

    await page.save();

    return ok(res, "Legal page saved and updated successfully.", { page });
  } catch (error) {
    console.error("[LegalPageController] updateLegalPage error:", error);
    return serverError(res, "Failed to save legal page changes.");
  }
};

