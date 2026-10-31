import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PUJAVEDA_CATEGORIES = [
  {
    name: "Puja Items & Samagri",
    slug: "puja-items",
    order: 1,
    subcategories: [
      { name: "Daily Puja Essentials", slug: "daily-puja-essentials" },
      { name: "Dhoop & Agarbatti", slug: "dhoop-agarbatti" },
      { name: "Camphor & Pure Kapur", slug: "camphor-pure-kapur" },
      { name: "Roli, Chandan & Kumkum", slug: "roli-chandan-kumkum" },
      { name: "Gangajal & Sacred Itra", slug: "gangajal-sacred-itra" },
      { name: "Puja Ghee & Diya Batti", slug: "puja-ghee-diya-batti" },
    ],
  },
  {
    name: "Complete Puja Packages",
    slug: "puja-packages",
    order: 2,
    subcategories: [
      { name: "Satyanarayan Puja Kit", slug: "satyanarayan-puja-kit" },
      { name: "Griha Pravesh Samagri Kit", slug: "griha-pravesh-kit" },
      { name: "Navratri Special Puja Kit", slug: "navratri-puja-kit" },
      { name: "Diwali Mahalakshmi Kit", slug: "diwali-mahalakshmi-kit" },
      { name: "Rudrabhishek Complete Kit", slug: "rudrabhishek-kit" },
    ],
  },
  {
    name: "Samaskara Packages",
    slug: "samaskara-packages",
    order: 3,
    subcategories: [
      { name: "Namkaran Sanskar Kit", slug: "namkaran-sanskar-kit" },
      { name: "Mundan Sanskar Kit", slug: "mundan-sanskar-kit" },
      { name: "Janeu (Yajnopavita) Kit", slug: "janeu-sanskar-kit" },
      { name: "Vivah (Wedding) Puja Samagri", slug: "vivah-puja-samagri" },
    ],
  },
  {
    name: "Murtis & Divine Brass Idols",
    slug: "murtis-idols",
    order: 4,
    subcategories: [
      { name: "Brass Ganesha Idols", slug: "brass-ganesha-idols" },
      { name: "Maha Lakshmi Brass Idols", slug: "mahalakshmi-brass-idols" },
      { name: "Radha Krishna Murti", slug: "radha-krishna-murti" },
      { name: "Shiv Parvati & Nandi", slug: "shiv-parvati-nandi" },
      { name: "Panchmukhi Hanuman Murti", slug: "panchmukhi-hanuman-murti" },
    ],
  },
  {
    name: "Sacred Shankh",
    slug: "shankh",
    order: 5,
    subcategories: [
      { name: "Dakshinavarti Laxmi Shankh", slug: "dakshinavarti-shankh" },
      { name: "Vamavarti Blowing Shankh", slug: "vamavarti-shankh" },
      { name: "Ganesha Carved Shankh", slug: "ganesha-shankh" },
      { name: "Pure Brass Shankh Stands", slug: "brass-shankh-stands" },
    ],
  },
  {
    name: "Gopal Vastra & Poshak",
    slug: "gopal-vastra",
    order: 6,
    subcategories: [
      { name: "Laddu Gopal Designer Poshak", slug: "laddu-gopal-poshak" },
      { name: "Zari Mukut & Morpankh", slug: "zari-mukut-morpankh" },
      { name: "Miniature Bansuri & Kundal", slug: "bansuri-kundal" },
      { name: "Royal Wooden & Velvet Singhasan", slug: "royal-singhasan" },
    ],
  },
  {
    name: "Religious Books & Vedic Texts",
    slug: "religious-books",
    order: 7,
    subcategories: [
      { name: "Shrimad Bhagavad Gita", slug: "bhagavad-gita" },
      { name: "Shri Ramcharitmanas", slug: "ramcharitmanas" },
      { name: "Sundarkand & Hanuman Chalisa", slug: "sundarkand-hanuman-chalisa" },
      { name: "Sampoorna Vrat Katha Sangrah", slug: "vrat-katha-sangrah" },
    ],
  },
  {
    name: "Puja Utensils & Brass Vessels",
    slug: "puja-utensils",
    order: 8,
    subcategories: [
      { name: "Pure Brass Akhand Diya", slug: "pure-brass-akhand-diya" },
      { name: "Etched Brass Puja Thali Sets", slug: "brass-puja-thali-sets" },
      { name: "Panchamrit Patra & Achmani", slug: "panchamrit-patra-achmani" },
      { name: "Carved Brass Puja Ghanti", slug: "brass-puja-ghanti" },
      { name: "Heavy Copper Hawan Kund", slug: "heavy-copper-hawan-kund" },
    ],
  },
  {
    name: "Puja Planner & Pandit Services",
    slug: "puja-planner",
    order: 9,
    subcategories: [
      { name: "Shubh Muhurat & Pandit Consultation", slug: "shubh-muhurat-consultation" },
      { name: "Customized Pandit Samagri Verification", slug: "custom-pandit-verification" },
      { name: "Varanasi & Haridwar Temple Sankalp", slug: "temple-sankalp-seva" },
    ],
  },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not found in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for Pujaveda migration...");

  const Category = mongoose.model(
    "Category",
    new mongoose.Schema({}, { strict: false })
  );
  const DivineCard = mongoose.model(
    "DivineCard",
    new mongoose.Schema({}, { strict: false })
  );
  const Banner = mongoose.model(
    "Banner",
    new mongoose.Schema({}, { strict: false })
  );

  // 1. Seed or Update Official Pujaveda Categories
  for (const cat of PUJAVEDA_CATEGORIES) {
    const existing = await Category.findOne({ slug: cat.slug });
    const subcats = cat.subcategories.map((s) => ({
      name: s.name,
      slug: s.slug,
      isActive: true,
      order: 0,
      createdAt: new Date(),
    }));

    if (existing) {
      existing.name = cat.name;
      existing.isActive = true;
      existing.order = cat.order;
      existing.subcategories = subcats;
      await existing.save();
      console.log(`Updated category: ${cat.name} (${cat.slug})`);
    } else {
      await Category.create({
        name: cat.name,
        slug: cat.slug,
        image: "",
        imageId: "",
        isActive: true,
        order: cat.order,
        subcategories: subcats,
      });
      console.log(`Created category: ${cat.name} (${cat.slug})`);
    }
  }

  // 2. Mark legacy electronics categories as inactive (safe preservation)
  const legacySlugs = ["audio", "wearables", "charging-power", "accessories"];
  const deactivation = await Category.updateMany(
    { slug: { $in: legacySlugs } },
    { $set: { isActive: false } }
  );
  console.log(`Deactivated ${deactivation.modifiedCount} legacy electronics categories.`);

  // 3. Seed Initial Divine Puja Essentials Cards if none exist
  const existingDivineCards = await DivineCard.countDocuments();
  if (existingDivineCards === 0) {
    await DivineCard.create([
      {
        title: "Mandir & Brass Puja Utensils",
        pretitle: "Sacred Altar Setup",
        description:
          "Authentic brass diyas, bell (ghanti), shankh stand, panchamrit patra and thali sets for daily morning archana.",
        imageUrl:
          "https://images.unsplash.com/photo-1609252925148-b0f1b515e111?w=800&auto=format&fit=crop&q=80",
        ctaText: "Explore Puja Utensils",
        link: "/category/puja-utensils",
        isActive: true,
        order: 1,
      },
      {
        title: "Finely Curated Asan & Havan Essentials",
        pretitle: "Yagna & Rituals",
        description:
          "Pure mango wood (aam ki lakdi), hawan red cheli, guggul, loban, dry coconut, and sacred kusha grass asan.",
        imageUrl:
          "https://images.unsplash.com/photo-1610450919927-52524997436f?w=800&auto=format&fit=crop&q=80",
        ctaText: "Explore Havan Samagri",
        link: "/category/puja-items",
        isActive: true,
        order: 2,
      },
    ]);
    console.log("Seeded initial Divine Puja Essentials cards in MongoDB.");
  }

  // 4. Seed Initial Promotional Banners if none exist
  const existingBanners = await Banner.countDocuments();
  if (existingBanners === 0) {
    await Banner.create([
      {
        title: "Sacred Durga & Navratri Puja Samagri",
        subtitle:
          "Complete authentic puja kits blessed with holy Gangajal, delivered directly to your doorstep across India.",
        imageUrl:
          "https://images.unsplash.com/photo-1609252925148-b0f1b515e111?w=1600&auto=format&fit=crop&q=80",
        ctaText: "Explore Festival Kits",
        link: "/category/puja-packages",
        active: true,
        order: 1,
      },
      {
        title: "Handcrafted Pure Brass Idols & Diyas",
        subtitle:
          "Premium artisan brass murtis of Lord Ganesha, Goddess Lakshmi, and sacred akhand diyas for your home mandir.",
        imageUrl:
          "https://images.unsplash.com/photo-1590073844006-33379778ae09?w=1600&auto=format&fit=crop&q=80",
        ctaText: "View Brass Idols",
        link: "/category/murtis-idols",
        active: true,
        order: 2,
      },
    ]);
    console.log("Seeded initial promotional banners in MongoDB.");
  }

  console.log("Pujaveda migration completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

