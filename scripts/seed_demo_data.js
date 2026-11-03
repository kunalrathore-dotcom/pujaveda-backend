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
    description: "Simple step-by-step guides, helpful preparation checklists, and practical tips for home pujas and ceremonies.",
    order: 1,
  },
  {
    name: "Festival Guides",
    slug: "festival-guides",
    description: "Practical guides to celebrating Indian festivals at home with family, including altar setups and simple rituals.",
    order: 2,
  },
  {
    name: "Product Knowledge",
    slug: "product-knowledge",
    description: "Helpful advice on choosing authentic brass idols, natural dhoop, and caring for your sacred puja essentials.",
    order: 3,
  },
  {
    name: "Home Mandir Ideas",
    slug: "home-mandir-ideas",
    description: "Easy-to-follow ideas for setting up, organizing, and maintaining a peaceful, clean home temple space.",
    order: 4,
  },
  {
    name: "Spiritual Lifestyle",
    slug: "spiritual-lifestyle",
    description: "Simple daily routines, evening prayers, and practical mindfulness habits to bring calm to modern family life.",
    order: 5,
  },
];

const demoArticles = [
  {
    title: "A Simple Guide to Griha Pravesh Puja at Home",
    slug: "simple-guide-griha-pravesh-puja-at-home",
    category: "Puja Guides",
    shortDescription: "Moving into a new home? Here is a practical, step-by-step guide to preparing your space and conducting a peaceful housewarming puja.",
    coverImage: "https://images.unsplash.com/photo-1609137144822-263e8a4a5e3f?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Griha Pravesh Puja Guide: Checklist & Steps | Pujaveda",
    seoDescription: "A beginner-friendly guide to Griha Pravesh: essential samagri checklist, preparing your new home, and simple housewarming rituals.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>A Fresh Beginning in Your New Home</h2>
      <p>Moving into a new home is one of life's most memorable milestones. In Indian culture, performing a Griha Pravesh puja is a beautiful way to express gratitude for the new dwelling and fill the space with peace and positive thoughts before settling in.</p>

      <h2>Preparing Your Home Before the Puja</h2>
      <p>A little preparation goes a long way in ensuring your ceremony runs smoothly and calmly:</p>
      <ul>
        <li><strong>Clean thoroughly:</strong> Ensure all rooms, especially the kitchen and mandir area, are tidy and uncluttered.</li>
        <li><strong>Adorn the entrance:</strong> Hang a fresh toran of mango leaves and marigold blossoms on the front door to create a warm welcome.</li>
        <li><strong>Draw a welcoming rangoli:</strong> A simple rangoli with natural rice flour and turmeric at the entrance adds festive joy.</li>
      </ul>

      <blockquote>"A home becomes a sanctuary when filled with gratitude, patience, and love."</blockquote>

      <h2>Essential Items Checklist</h2>
      <p>Here are the primary items needed for a standard housewarming ceremony:</p>
      <ul>
        <li><strong>Kalash & Coconut:</strong> A clean brass or copper pot filled with water, mango leaves, and a coconut wrapped in red thread.</li>
        <li><strong>Puja Thali:</strong> Turmeric powder (haldi), vermilion (kumkum), raw unpolished rice (akshat), and sandalwood paste.</li>
        <li><strong>Lighting:</strong> A brass diya with pure cow ghee or sesame oil, cotton wicks, and gentle herbal incense.</li>
        <li><strong>Offerings:</strong> Fresh flowers, seasonal fruits, sweets (prasad), and betel leaves with whole betel nuts.</li>
      </ul>

      <h2>Step-by-Step Ceremony Overview</h2>
      <p>Whether you have a pandit guiding you or are conducting a simple family prayer, the sequence is straightforward:</p>
      <ol>
        <li><strong>Threshold Welcome:</strong> The family enters the home together with the auspicious kalash, stepping with the right foot first.</li>
        <li><strong>Ganesha Prayer:</strong> Begin by offering flowers and rice to Lord Ganesha, praying for an obstacle-free, peaceful stay.</li>
        <li><strong>Boiling Milk:</strong> On a newly cleaned stove, boil milk in an open vessel until it gently spills over, traditionally symbolizing abundance and sweetness in the household.</li>
        <li><strong>Lighting the First Diya:</strong> Place and light your main diya in the mandir corner, recite a favorite family prayer, and distribute sweets.</li>
      </ol>

      <h2>Helpful Advice for Families</h2>
      <p>Remember that sincere devotion and a joyful, relaxed atmosphere matter far more than rigid complexity. Keep the ritual simple, involve every family member, and enjoy the beginning of your new journey together.</p>
    `,
  },
  {
    title: "Preparing for Diwali Lakshmi Puja: A Beginner's Guide",
    slug: "preparing-for-diwali-lakshmi-puja-beginners-guide",
    category: "Festival Guides",
    shortDescription: "Celebrate Diwali with devotion and clarity. Learn how to set up your home altar and perform evening Lakshmi Puja with family.",
    coverImage: "https://images.unsplash.com/photo-1574676104449-33b1e326b978?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Diwali Lakshmi Puja Setup & Beginner's Guide | Pujaveda",
    seoDescription: "Learn how to prepare for Diwali evening Lakshmi Puja: table setup, essential diyas, family prayer steps, and practical safety tips.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>The Warmth of Deepavali Evening</h2>
      <p>Diwali is a festival of illumination, gratitude, and renewed hope. The evening Lakshmi Puja brings families together in prayer to celebrate life's blessings and welcome peace and good fortune into the household.</p>

      <h2>Setting Up Your Puja Altar</h2>
      <p>You do not need an elaborate setup to make your altar reverent and beautiful:</p>
      <ul>
        <li><strong>Choose a clean surface:</strong> A low wooden chowki or tabletop placed in the East or North corner works wonderfully.</li>
        <li><strong>Cloth base:</strong> Spread a fresh red, yellow, or ivory cloth over the chowki.</li>
        <li><strong>Placing the Idols:</strong> Place Lord Ganesha on the left and Goddess Lakshmi on the right. A small bed of raw rice grains can be placed under the idols as a traditional seat.</li>
        <li><strong>The Sacred Pot (Kalash):</strong> Place a small brass kalash filled with clean water, adorned with five mango leaves and a coconut.</li>
      </ul>

      <h2>What You Need for the Evening</h2>
      <p>Gather these items an hour before puja so you can sit down peacefully:</p>
      <ul>
        <li>A primary brass diya with cow ghee and two cotton wicks.</li>
        <li>Clay diyas for surrounding windows and entryways.</li>
        <li>Fresh marigold or rose flowers, batasha, and homemade kheer or dry fruits for prasad.</li>
        <li>Natural dhoop or incense sticks.</li>
      </ul>

      <h2>A Simple Family Prayer Routine</h2>
      <ol>
        <li>Start by applying a small tilak of sandalwood or kumkum to the deities and each family member.</li>
        <li>Light the main diya and offer fresh flowers while reciting simple prayers or listening to traditional bhajans.</li>
        <li>Express silent gratitude for the health, unity, and safety of your loved ones.</li>
        <li>Sing the Lakshmi Aarti together, gently circle the aarti plate, and share prasad among everyone.</li>
      </ol>

      <h2>Safety Tips for Diyas</h2>
      <p>Keep oil diyas away from long curtains, paper decorations, and electrical cords. Always ensure diyas are placed on stable surfaces and extinguished safely before going to sleep.</p>
    `,
  },
  {
    title: "How to Choose and Care for Brass Idols in Your Mandir",
    slug: "how-to-choose-and-care-for-brass-idols",
    category: "Product Knowledge",
    shortDescription: "Practical advice on selecting quality brass murtis for your home temple and keeping them shining brightly year-round.",
    coverImage: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Choosing & Caring for Brass Idols at Home | Pujaveda",
    seoDescription: "Practical advice on selecting quality brass murtis for your home mandir and natural methods to clean and polish brass without scratching.",
    status: "published",
    author: "Pt. Rameshwar Shastri",
    content: `
      <h2>The Timeless Charm of Brass Murtis</h2>
      <p>Brass (Pital) has been the favored material for home mandirs for centuries. It carries a golden radiance, lasts for generations, and withstands daily ablution and cleaning without rusting or breaking.</p>

      <h2>What to Look for When Buying Brass Idols</h2>
      <p>When selecting a murti for your home altar, look for these practical hallmarks of good quality:</p>
      <ul>
        <li><strong>Weight and Feel:</strong> A quality brass idol feels solid and heavy in your hands. Avoid overly light, hollow statues that tip over easily.</li>
        <li><strong>Facial Expression:</strong> Look closely at the eyes, smile, and posture. Artisanal lost-wax cast statues feature gentle, balanced, and serene expressions.</li>
        <li><strong>Smooth Finishing:</strong> Run your fingers gently along the edges. The statue should be free of sharp burrs or rough mold seams.</li>
      </ul>

      <h2>Natural Ways to Clean and Polish Brass</h2>
      <p>Over time, brass naturally darkens due to exposure to air, incense smoke, and moisture. You can easily restore its warm golden glow using simple kitchen ingredients:</p>

      <blockquote>"Gentle, regular cleaning preserves the detailed hand carvings of your sacred idols far better than harsh chemicals."</blockquote>

      <ul>
        <li><strong>Lemon and Salt Method:</strong> Cut a fresh lemon in half, sprinkle a pinch of fine salt on the surface, and gently rub the brass. The natural citric acid dissolves surface tarnish within seconds.</li>
        <li><strong>Tamarind Paste:</strong> Soak a small piece of tamarind in warm water, apply the paste over the idol, let it sit for two minutes, and wipe clean.</li>
        <li><strong>Pitambari Powder:</strong> For deep cleaning before festivals, use standard pitambari powder with a soft cotton cloth.</li>
      </ul>

      <h2>What to Avoid</h2>
      <p>Never clean fine brass idols with abrasive metal scourers, wire brushes, or harsh acid-based toilet cleaners. These leave deep scratches and remove the natural warm patina of the metal. Always rinse with clean water and dry thoroughly with a soft microfiber cloth.</p>
    `,
  },
  {
    title: "Setting Up a Peaceful Home Mandir: Simple Vastu and Altar Tips",
    slug: "setting-up-a-peaceful-home-mandir-simple-tips",
    category: "Home Mandir Ideas",
    shortDescription: "Create a serene worship space in your home with easy-to-follow layout, lighting, and decluttering suggestions.",
    coverImage: "https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "Home Mandir Setup & Simple Vastu Tips | Pujaveda",
    seoDescription: "Practical guide to setting up a peaceful home mandir: recommended direction, altar height, clutter-free storage, and soft lighting ideas.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>Creating a Calm Corner for the Family</h2>
      <p>In our busy modern lives, having a quiet, dedicated space in the home for prayer and reflection offers a peaceful retreat. Whether you have an entire room or a modest shelf in an apartment, a few thoughtful choices can make your mandir a source of daily serenity.</p>

      <h2>Ideal Direction and Placement</h2>
      <p>According to traditional architectural wisdom (Vastu Shastra):</p>
      <ul>
        <li><strong>The Northeast Corner:</strong> The Northeast (Ishanya) or East direction is considered ideal for a prayer space, as it captures the fresh morning sunlight and airflow.</li>
        <li><strong>Facing Direction:</strong> While seated for prayer, it is generally recommended to face East or North.</li>
        <li><strong>Areas to Avoid:</strong> Try not to place the altar directly under a staircase, against a shared bathroom wall, or directly facing a bed.</li>
      </ul>

      <h2>Comfortable Altar Height</h2>
      <p>Place your mandir or shelf at an elevation where the idols sit roughly at your chest level when seated on the floor or a low cushion. This allows you to look gently forward or slightly upward during meditation without straining your neck.</p>

      <h2>Lighting and Subtle Fragrance</h2>
      <ul>
        <li><strong>Warm Lighting:</strong> Use warm white or soft golden LED bulbs rather than harsh blue-white lights.</li>
        <li><strong>Natural Diyas:</strong> A small brass ghee lamp lit in the morning and evening creates a focused, tranquil focal point.</li>
        <li><strong>Gentle Incense:</strong> Choose mild, charcoal-free dhoop sticks made with natural herbs, sandalwood, or rose petals. Strong artificial chemical fragrances can cause headaches.</li>
      </ul>

      <h2>Keep It Clutter-Free</h2>
      <p>The secret to a peaceful mandir is simplicity. Avoid keeping piles of matchboxes, old plastic bags, or withered flowers on the altar. Store extra oil bottles and cotton wicks in a neat lidded basket or lower drawer so the prayer shelf stays clean and calm.</p>
    `,
  },
  {
    title: "A Simple 10-Minute Evening Puja Routine for Busy Families",
    slug: "simple-10-minute-evening-puja-routine-for-busy-families",
    category: "Spiritual Lifestyle",
    shortDescription: "How a brief, unhurried evening routine of lighting a diya and taking a moment of gratitude brings calm after a hectic day.",
    coverImage: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
    seoTitle: "10-Minute Evening Puja Routine for Families | Pujaveda",
    seoDescription: "Discover how a brief 10-minute evening puja routine of lighting a diya, quiet breathing, and gratitude brings peace to a busy household.",
    status: "published",
    author: "Pujaveda Editorial",
    content: `
      <h2>The Meaning of the Evening Twilight</h2>
      <p>As the sun sets and the work day ends, evening marks a natural transition. In Indian tradition, lighting the evening diya (Sandhya Deepam) represents a mindful moment to pause, let go of the day's stress, and bring light and peace into the home.</p>

      <h2>What You Need Ready in 1 Minute</h2>
      <p>Keep your evening setup quick and effortless:</p>
      <ul>
        <li>A small brass diya with cow ghee or sesame oil.</li>
        <li>A single cotton wick.</li>
        <li>A stick of natural incense.</li>
        <li>A small hand bell.</li>
      </ul>

      <h2>A Simple 3-Step Routine (10 Minutes)</h2>
      <ol>
        <li><strong>Wash and Light (2 minutes):</strong> Wash your hands and face with cool water to signal a shift in focus. Light the diya, light the incense, and gently ring the brass bell.</li>
        <li><strong>Silent Gratitude (4 minutes):</strong> Sit quietly before the mandir. Take five slow, deep breaths. Close your eyes and silently reflect on three things you were grateful for today — whether it was good health, a kind gesture, or shared laughter.</li>
        <li><strong>Short Prayer or Aarti (4 minutes):</strong> Recite a simple prayer you love, chant the Gayatri Mantra a few times, or sing a short family aarti together.</li>
      </ol>

      <h2>Involving Children and Elders</h2>
      <p>The evening prayer is a wonderful way to connect generations. Let children place a flower or ring the bell, and encourage them to share one good thing that happened during their school day. Over time, this brief routine becomes a comforting anchor that children remember fondly throughout their lives.</p>

      <h2>Consistency Over Complexity</h2>
      <p>You do not need an hour of complicated rituals. A sincere, quiet 10 minutes done every evening with a peaceful heart brings immense harmony to any household.</p>
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

    // 2. Seed Blog Articles (Clean update or creation)
    console.log("\n--- Seeding / Updating Blog Articles ---");
    for (const art of demoArticles) {
      const catId = categoryMap[art.category] || null;
      // Find by matching slug or category for existing demo articles
      let existing = await Blog.findOne({ slug: art.slug });
      if (!existing) {
        // Also check if an earlier demo article existed for this category
        existing = await Blog.findOne({ category: art.category, isDemo: true });
      }

      if (existing) {
        existing.title = art.title;
        existing.slug = art.slug;
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

    // Verification counts
    console.log("\n--- Verification of Database Collections ---");
    const catCount = await BlogCategory.countDocuments({ isDeleted: { $ne: true } });
    const blogCount = await Blog.countDocuments({ isDeleted: { $ne: true } });
    const couponCount = await Coupon.countDocuments({ isDeleted: { $ne: true } });
    console.log(`Active Blog Categories in DB: ${catCount}`);
    console.log(`Active Blog Articles in DB: ${blogCount}`);
    console.log(`Active Coupons in DB: ${couponCount}`);

    await mongoose.disconnect();
    console.log("\nDone! Database successfully updated with simple, natural customer-friendly demo articles.");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
