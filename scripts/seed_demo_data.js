import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { BlogCategory } from "../src/models/BlogCategory.js";
import { Blog } from "../src/models/Blog.js";
import { Coupon } from "../src/models/Coupon.js";

const demoCategories = [
  {
    name: "Puja Guides",
    slug: "puja-guides",
    description: "Step-by-step ritual guides, auspicious vidhis, and authentic samagri checklists for daily and festive Hindu worship.",
    order: 1,
  },
  {
    name: "Festival Guides",
    slug: "festival-guides",
    description: "Comprehensive guides to major Sanatan Dharma festivals, auspicious muhurats, and sacred vrat observances.",
    order: 2,
  },
  {
    name: "Product Knowledge",
    slug: "product-knowledge",
    description: "Deep dive into sacred brass idols, energized shankhs, organic herbal dhoop, and handcrafted spiritual artifacts.",
    order: 3,
  },
  {
    name: "Home Mandir Ideas",
    slug: "home-mandir-ideas",
    description: "Vedic Vastu Shastra recommendations, sacred altar setups, lighting tips, and peaceful home sanctuary inspiration.",
    order: 4,
  },
  {
    name: "Spiritual Lifestyle",
    slug: "spiritual-lifestyle",
    description: "Integrating Sanatan wisdom, daily morning/evening Sandhya rituals, mantra chanting, and sattvic living into modern life.",
    order: 5,
  },
];

const demoArticles = [
  {
    title: "Complete Griha Pravesh Puja Vidhi & Essential Samagri Checklist",
    slug: "complete-griha-pravesh-puja-vidhi-and-samagri-checklist",
    category: "Puja Guides",
    shortDescription: "A comprehensive step-by-step guide to conducting an auspicious Griha Pravesh ceremony with all required Vedic samagri and rituals.",
    coverImage: "https://images.unsplash.com/photo-1609137144822-263e8a4a5e3f?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Griha Pravesh Puja Vidhi & Samagri Checklist | Pujaveda",
    seoDescription: "Step-by-step guide to conducting an authentic Vedic Griha Pravesh ritual with essential samagri, Vastu tips, and auspicious muhurats.",
    status: "published",
    author: "Acharya Vidyadhar",
    content: `
      <h2>The Significance of Griha Pravesh</h2>
      <p>Griha Pravesh (Housewarming) is one of the most sacred samskaras in Vedic tradition. Before occupying a new dwelling, performing the Vastu Shanti and Navagraha Havan cleanses the premises of negative energies and invites divine prosperity into the home.</p>

      <h2>Auspicious Preparations</h2>
      <p>Before the pandit arrives, ensure the home is completely cleaned, painted, and the main entrance (Simhadwara) is adorned with a toran of fresh mango leaves and marigold blossoms. Drawing an auspicious Swastika and Rangoli with pure turmeric and vermillion creates a protective spiritual threshold.</p>

      <blockquote>"Yatra naryastu pujyante ramante tatra Devata — Where sacred purity and righteousness reside, there the gods rejoice."</blockquote>

      <h2>Essential Samagri Checklist</h2>
      <ul>
        <li><strong>Copper or Brass Kalash:</strong> Filled with holy Ganga jal, mango leaves, and a whole coconut wrapped in red mauli thread.</li>
        <li><strong>Panchamrit:</strong> Blend of pure cow milk, fresh curd, desi ghee, raw honey, and bura (unrefined sugar).</li>
        <li><strong>Havan Essentials:</strong> Pure cow dung cakes, dry mango wood sticks (samidha), black sesame seeds (til), jav, and pure camphor tablets.</li>
        <li><strong>Navagraha Puja Samagri:</strong> Nine types of grains (Navadhanya) and colored cloths corresponding to the nine celestial planetary deities.</li>
      </ul>

      <h2>Step-by-Step Ritual Sequence</h2>
      <p>The ceremony commences with <em>Ganapati Puja</em> to remove all obstacles, followed by <em>Vastu Purusha Aradhana</em> at the northeast (Ishanya) corner. The sacred Havan fire is kindled with ghee and chanting of the Gayatri and Mahamrityunjaya Mantras, culminating in the boiling over of milk on a new stove to symbolize inexhaustible abundance.</p>
    `,
  },
  {
    title: "Diwali Lakshmi-Ganesha Puja: Sacred Altar Setup & Vedic Muhurat",
    slug: "diwali-lakshmi-ganesha-puja-sacred-altar-setup-and-muhurat",
    category: "Festival Guides",
    shortDescription: "Learn how to prepare the sacred Pradosh Kaal altar for Deepavali, place Mahalakshmi and Lord Ganesha correctly, and invoke eternal prosperity.",
    coverImage: "https://images.unsplash.com/photo-1574676104449-33b1e326b978?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Diwali Lakshmi Ganesha Puja Guide & Altar Setup | Pujaveda",
    seoDescription: "Detailed step-by-step instructions for Diwali evening Lakshmi Puja, altar placement rules, and essential brass diya lighting traditions.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>The Divine Night of Deepavali</h2>
      <p>Diwali marks the auspicious arrival of Goddess Mahalakshmi into homes swept clean of clutter and illuminated by devotion. Performing Lakshmi Puja during the auspicious <em>Pradosh Kaal</em> and <em>Sthir Lagna</em> is believed to bestow lasting fortune that never departs.</p>

      <h2>Sacred Altar Placement Rules</h2>
      <p>Set up the chowki (wooden altar) in the East or North direction covered with a fresh red silk cloth. Place Lord Ganesha to the left of Goddess Lakshmi (from the worshipper's viewpoint), as Lord Ganesha is the remover of impediments and Lakshmi is the giver of siddhis.</p>

      <ul>
        <li><strong>Akshat Bed:</strong> Create a bed of raw unpolished rice grains mixed with turmeric beneath the deities.</li>
        <li><strong>Ashtalakshmi Kalash:</strong> Place a copper kalash with betel nut, a silver coin, cardamom, and fresh water topped with coconut.</li>
        <li><strong>Pure Brass Diyas:</strong> Light the primary Panchamukhi brass diya with pure cow ghee and 21 earthen diyas with sesame (til) oil.</li>
      </ul>

      <h2>The Shodashopachara Worship</h2>
      <p>Offer fragrant red lotus blossoms, whole supari, dry fruits, batasha, and fresh kheer. Recite the Sri Suktam and Lakshmi Ashtakam with calm contemplation. Conclude with Maha Aarti and distribution of prasad among family and loved ones.</p>
    `,
  },
  {
    title: "Identifying Authentic Brass & Panchdhatu Idols: A Connoisseur's Guide",
    slug: "identifying-authentic-brass-and-panchdhatu-idols-guide",
    category: "Product Knowledge",
    shortDescription: "Essential knowledge on brass weight, acoustic resonance, lost-wax casting details, and how to distinguish pure brass from cheap electroplated alloys.",
    coverImage: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Authentic Brass & Panchdhatu Idols Guide | Pujaveda",
    seoDescription: "How to identify authentic solid brass and panchaloha murti: weight tests, casting hallmarks, acoustic resonance, and sacred metal alloys.",
    status: "published",
    author: "Pt. Rameshwar Shastri",
    content: `
      <h2>Sacred Metallurgy in Sanatan Worship</h2>
      <p>In the Shilpa Shastras and Agamas, idols consecrated for worship must possess specific metallurgical purities. Pure brass (Pital) and Panchdhatu (an alloy of gold, silver, copper, zinc, and iron) emit positive energetic vibrations and resist negative psychic decay.</p>

      <h2>Key Tests for Purity</h2>
      <ul>
        <li><strong>Heft & Weight Test:</strong> Authentic solid brass murtis have substantial heft. Hollow cast or resin-filled replicas feel unnaturally light for their dimensions.</li>
        <li><strong>Acoustic Resonance:</strong> When lightly tapped with a coin, pure high-grade brass emits a clear, bell-like chime that sustains for several seconds. Cheaper zinc-heavy alloys produce a dull thud.</li>
        <li><strong>Lost-Wax Hand Finishing:</strong> Genuine artisanal statues show micro-chisel marks, intricate facial symmetry (Nayan Unmeelan), and natural hand-carved textures rather than plastic mold seam lines.</li>
      </ul>

      <h2>Care and Maintenance of Sacred Brass</h2>
      <p>Clean your home mandir idols gently using natural pitambari powder, lemon juice, or tamarind paste mixed with rock salt. Rinse thoroughly with clean warm water and buff with a soft microfiber cloth to preserve their radiant golden sheen.</p>
    `,
  },
  {
    title: "Setting Up an Auspicious North-East Home Mandir as per Vastu Shastra",
    slug: "setting-up-auspicious-northeast-home-mandir-vastu-shastra",
    category: "Home Mandir Ideas",
    shortDescription: "Practical Vastu guidelines for placing your home temple in the Ishanya zone, ideal altar heights, idol arrangement, and sacred color palettes.",
    coverImage: "https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Home Mandir Vastu Shastra Guide: North-East Altar Setup | Pujaveda",
    seoDescription: "Learn how to position your home mandir according to Vastu Shastra: Ishanya corner benefits, altar height, and deity arrangement rules.",
    status: "published",
    author: "Vastu Vidya Council",
    content: `
      <h2>The Ishanya Kon: Gateway of Cosmic Energy</h2>
      <p>According to Vastu Purusha Mandala, the Northeast (Ishanya) direction is governed by Lord Shiva and the planet Jupiter (Guru). It represents the head of the cosmic being, making it the most auspicious zone for meditation, prayer, and divine communion.</p>

      <h2>Mandir Height & Structural Rules</h2>
      <p>The base of the temple should be constructed so that the idols stand at the worshipper's chest level when seated. Deities should never be placed directly on the floor. While praying, the devotee should ideally face East or North.</p>

      <ul>
        <li><strong>Wood Selection:</strong> Teakwood (Sagwan), Sheesham, or pure white marble are considered the most sattvic materials for home sanctums.</li>
        <li><strong>Harmonious Colors:</strong> Paint the mandir alcove in soft ivory, warm saffron, light yellow, or pale cream. Avoid harsh dark grey or black tones.</li>
        <li><strong>Idol Spacing:</strong> Ensure deities are kept at least one inch away from the back wall and do not face each other directly.</li>
      </ul>

      <h2>Maintaining Sacred Atmosphere</h2>
      <p>Keep the mandir clutter-free. Burn natural cow-ghee diyas and natural sandalwood or guggal dhoop daily at sunrise and sunset to maintain a tranquil, spiritually charged ambiance.</p>
    `,
  },
  {
    title: "The Transformative Power of Daily Sandhya Aarti and Vedic Chanting",
    slug: "transformative-power-daily-sandhya-aarti-and-vedic-chanting",
    category: "Spiritual Lifestyle",
    shortDescription: "Discover how the twilight Sandhyavandanam ritual and sound frequencies of traditional Sanskrit aartis harmonize body, mind, and home vibration.",
    coverImage: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "The Science & Serenity of Daily Sandhya Aarti | Pujaveda",
    seoDescription: "Discover the spiritual and psychological benefits of performing morning and evening Sandhya Aarti with traditional brass bells and mantras.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>The Sacred Junction of Twilight</h2>
      <p>In Vedic philosophy, <em>Sandhya</em> refers to the sacred confluence of day and night — sunrise and sunset. At these twilight moments, the natural world transitions, the mind becomes naturally reflective, and spiritual practices yield manifold benefits.</p>

      <h2>The Science of Sacred Sound (Shabda Brahma)</h2>
      <p>Chanting ancient Sanskrit mantras accompanied by the pure bronze resonance of a Ghanti (temple bell) produces acoustic frequencies that stimulate the parasympathetic nervous system, reducing mental cortisol and cultivating profound inner calm.</p>

      <blockquote>"Om Dyauh Shantir Antariksham Shantih, Prithivi Shantir Apah Shantir Oshadhayah Shantih — May peace radiate throughout the celestial skies, the atmosphere, the earth, and sacred waters."</blockquote>

      <h2>Simple 15-Minute Evening Routine</h2>
      <ul>
        <li>Wash hands and feet, sit peacefully facing East, and take three mindful breaths.</li>
        <li>Light an authentic five-wick brass diya using pure cow ghee and camphor.</li>
        <li>Offer fragrant dhoop while ringing the bell rhythmically to dissipate stagnant energies.</li>
        <li>Chant 11 rounds of the Gayatri Mantra or Mahamrityunjaya Mantra with genuine reverence.</li>
      </ul>
      <p>Conclude by sitting in silent gratitude for two minutes. This simple daily observance transforms a house into a sacred sanctuary of peace.</p>
    `,
  },
];

const demoCoupons = [
  {
    code: "VEDA100",
    description: "Flat ₹100 off on pure Vedic puja samagri on orders above ₹999.",
    discountType: "fixed",
    discountValue: 100,
    minCartValue: 999,
    maxDiscount: 100,
    startDate: new Date("2026-01-01"),
    expiryDate: new Date("2027-12-31"),
    totalUsageLimit: 1000,
    perUserLimit: 3,
    isActive: true,
    isDemo: true,
  },
  {
    code: "FESTIVE15",
    description: "15% off up to ₹500 on festive packages and sacred brass idols.",
    discountType: "percentage",
    discountValue: 15,
    minCartValue: 1499,
    maxDiscount: 500,
    startDate: new Date("2026-01-01"),
    expiryDate: new Date("2027-12-31"),
    totalUsageLimit: 500,
    perUserLimit: 2,
    isActive: true,
    isDemo: true,
  },
  {
    code: "SHUBH50",
    description: "Welcome blessing: ₹50 off on your spiritual essentials order above ₹499.",
    discountType: "fixed",
    discountValue: 50,
    minCartValue: 499,
    maxDiscount: 50,
    startDate: new Date("2026-01-01"),
    expiryDate: new Date("2027-12-31"),
    totalUsageLimit: 2000,
    perUserLimit: 1,
    isActive: true,
    isDemo: true,
  },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGODB_URI not set in environment!");
      process.exit(1);
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.\n");

    // 1. Seed Blog Categories
    console.log("--- Seeding Blog Categories ---");
    const categoryMap = {};
    for (const cat of demoCategories) {
      const existing = await BlogCategory.findOne({ slug: cat.slug });
      if (existing) {
        existing.name = cat.name;
        existing.description = cat.description;
        existing.order = cat.order;
        existing.isDeleted = false;
        existing.isDemo = true;
        await existing.save();
        categoryMap[cat.name] = existing._id;
        console.log(`Updated existing category: ${cat.name} (${existing._id})`);
      } else {
        const created = await BlogCategory.create({
          ...cat,
          isDeleted: false,
          isDemo: true,
        });
        categoryMap[cat.name] = created._id;
        console.log(`Created new category: ${cat.name} (${created._id})`);
      }
    }

    // 2. Seed Blog Articles
    console.log("\n--- Seeding Blog Articles ---");
    for (const art of demoArticles) {
      const existing = await Blog.findOne({ slug: art.slug });
      const catId = categoryMap[art.category] || null;
      if (existing) {
        existing.title = art.title;
        existing.category = art.category;
        existing.categoryId = catId;
        existing.shortDescription = art.shortDescription;
        existing.coverImage = art.coverImage;
        existing.content = art.content;
        existing.seoTitle = art.seoTitle;
        existing.seoDescription = art.seoDescription;
        existing.status = art.status;
        existing.author = art.author;
        existing.publishedAt = existing.publishedAt || new Date();
        existing.isDeleted = false;
        existing.isDemo = true;
        await existing.save();
        console.log(`Updated existing article: "${art.title}" (${existing._id})`);
      } else {
        const created = await Blog.create({
          ...art,
          categoryId: catId,
          publishedAt: new Date(Date.now() - Math.floor(Math.random() * 5 + 1) * 86400000),
          isDeleted: false,
          isDemo: true,
        });
        console.log(`Created new article: "${art.title}" (${created._id})`);
      }
    }

    // 3. Seed Coupons
    console.log("\n--- Seeding Demo Coupons ---");
    for (const coup of demoCoupons) {
      const existing = await Coupon.findOne({ code: coup.code });
      if (existing) {
        existing.description = coup.description;
        existing.discountType = coup.discountType;
        existing.discountValue = coup.discountValue;
        existing.minCartValue = coup.minCartValue;
        existing.maxDiscount = coup.maxDiscount;
        existing.startDate = coup.startDate;
        existing.expiryDate = coup.expiryDate;
        existing.totalUsageLimit = coup.totalUsageLimit;
        existing.perUserLimit = coup.perUserLimit;
        existing.isActive = true;
        existing.isDeleted = false;
        existing.isDemo = true;
        await existing.save();
        console.log(`Updated existing coupon: ${coup.code} (${existing._id})`);
      } else {
        const created = await Coupon.create({
          ...coup,
        });
        console.log(`Created new coupon: ${coup.code} (${created._id})`);
      }
    }

    // Final verification counts
    console.log("\n--- Verification of Database Collections ---");
    const catCount = await BlogCategory.countDocuments({ isDeleted: { $ne: true } });
    const blogCount = await Blog.countDocuments({ isDeleted: { $ne: true } });
    const couponCount = await Coupon.countDocuments({ isDeleted: { $ne: true } });
    console.log(`Active Blog Categories in DB: ${catCount}`);
    console.log(`Active Blog Articles in DB: ${blogCount}`);
    console.log(`Active Coupons in DB: ${couponCount}`);

    await mongoose.disconnect();
    console.log("\nDone! Database successfully populated with realistic demo records.");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();

