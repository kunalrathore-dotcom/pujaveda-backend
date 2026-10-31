import dotenv from "dotenv";
dotenv.config();

import { connectDB, closeDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Banner } from "../models/Banner.js";

/**
 * Optional Manual Seeder Script
 *
 * NOTE: This script is strictly MANUAL and is NEVER executed automatically.
 * It does NOT drop collections or delete existing database records.
 * Run explicitly using: npm run seed
 */

const initialCategories = [
  {
    name: "Audio",
    slug: "audio",
    subcategories: [
      { name: "Wireless Earbuds", slug: "wireless-earbuds" },
      { name: "Neckbands", slug: "neckbands" },
    ],
  },
  {
    name: "Headphones",
    slug: "headphones",
    subcategories: [
      { name: "Wireless Headphones", slug: "wireless-headphones" },
      { name: "Wired Headphones", slug: "wired-headphones" },
    ],
  },
  {
    name: "Smartwatches",
    slug: "smartwatches",
    subcategories: [
      { name: "Bluetooth Calling", slug: "calling-watches" },
      { name: "Fitness Watches", slug: "fitness-watches" },
    ],
  },
  {
    name: "Speakers",
    slug: "speakers",
    subcategories: [
      { name: "Portable Speakers", slug: "portable-speakers" },
      { name: "Party Speakers", slug: "party-speakers" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    subcategories: [
      { name: "Chargers & Cables", slug: "chargers-cables" },
      { name: "Cases & Straps", slug: "cases-straps" },
    ],
  },
];

const photo = {
  earbuds: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=85",
  headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
  speaker: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85",
  accessories: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=85",
};

const productDefinitions = [
  ["audio", "wireless-earbuds", "Wireless Earbuds", "earbuds", [
    ["Pulse Buds Pro", 2499, 4999],
    ["AirBeat Neo", 1499, 2999],
  ]],
  ["audio", "neckbands", "Neckbands", "earbuds", [
    ["Flex Neckband X", 1299, 2499],
    ["Rhythm Neckband", 999, 1999],
  ]],
  ["headphones", "wireless-headphones", "Wireless Headphones", "headphones", [
    ["Studio Max Wireless", 3499, 5999],
    ["Bass Pro 700", 2799, 4999],
  ]],
  ["headphones", "wired-headphones", "Wired Headphones", "headphones", [
    ["Studio Wired One", 899, 1499],
    ["BassLine Wired", 699, 1299],
  ]],
  ["smartwatches", "calling-watches", "Bluetooth Calling", "watch", [
    ["Active Call Watch", 2999, 5999],
    ["Wave Smart Pro", 2499, 4999],
  ]],
  ["smartwatches", "fitness-watches", "Fitness Watches", "watch", [
    ["FitTrack Pulse", 1999, 3999],
    ["MoveFit Active", 1799, 3499],
  ]],
  ["speakers", "portable-speakers", "Portable Speakers", "speaker", [
    ["Boom Mini", 1499, 2999],
    ["TravelBeat Go", 1999, 3499],
  ]],
  ["speakers", "party-speakers", "Party Speakers", "speaker", [
    ["PartyBox 120", 4999, 7999],
    ["BassTower Max", 5999, 9999],
  ]],
  ["accessories", "chargers-cables", "Chargers & Cables", "accessories", [
    ["RapidCharge 30W", 799, 1299],
    ["Flex USB-C Cable", 299, 599],
  ]],
  ["accessories", "cases-straps", "Cases & Straps", "accessories", [
    ["Everyday Carry Case", 399, 799],
    ["Active Watch Strap", 249, 499],
  ]],
];

const initialBanners = [
  {
    title: "Featured Collection",
    subtitle: "Experience next-gen wireless acoustics with deep bass and crystal-clear clarity.",
    imageUrl: "https://www.boat-lifestyle.com/cdn/shop/files/mobile_Landing_page_banner_9682bd14-1e88-4209-b7da-9e6f1209914e.png?v=1793156114&width=1500",
    link: "/category/audio",
    active: true,
    order: 1,
  },
  {
    title: "Personalised Audio",
    subtitle: "Tailored sound profiles tuned for your everyday vibe and workouts.",
    imageUrl: "https://www.boat-lifestyle.com/cdn/shop/files/Personalised_mobile_5595f15e-0685-478d-adca-4581e21d2d50.png?v=1793156114&width=1500",
    link: "/category/headphones",
    active: true,
    order: 2,
  },
  {
    title: "Crest AI Series",
    subtitle: "AI-enhanced biometric health tracking with vibrant AMOLED display.",
    imageUrl: "https://www.boat-lifestyle.com/cdn/shop/files/CREST_AI_mobile.png?v=1793156830&width=1500",
    link: "/category/smartwatches",
    active: true,
    order: 3,
  },
];

export const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("[Seeder] Checking existing data (preserving existing records without dropping)...");

    // 1. Admin user
    const adminExists = await User.findOne({ email: "admin@sonic.com" });
    if (!adminExists) {
      await User.create({
        name: "Sonic Admin",
        email: "admin@sonic.com",
        password: "Sonic@123",
        role: "admin",
        phone: "+91 98765 00000",
      });
      console.log("[Seeder] Created default admin account: admin@sonic.com / Sonic@123");
    } else {
      console.log("[Seeder] Admin account already exists; preserved.");
    }

    // 2. Demo customer
    const userExists = await User.findOne({ email: "user@sonic.com" });
    if (!userExists) {
      await User.create({
        name: "Sonic User",
        email: "user@sonic.com",
        password: "Sonic@123",
        role: "user",
        phone: "+91 98765 11111",
      });
      console.log("[Seeder] Created default customer account: user@sonic.com / Sonic@123");
    } else {
      console.log("[Seeder] Customer account already exists; preserved.");
    }

    // 3. Categories
    const categoryDocs = {};
    for (const cat of initialCategories) {
      let doc = await Category.findOne({ slug: cat.slug });
      if (!doc) {
        doc = await Category.create(cat);
        console.log(`[Seeder] Created category: ${cat.name}`);
      }
      categoryDocs[doc.slug] = doc;
    }

    // 4. Products (only if none exist in the category)
    let addedProducts = 0;
    for (const [catSlug, subSlug, subName, imgType, items] of productDefinitions) {
      const catDoc = categoryDocs[catSlug];
      const img = photo[imgType];

      for (let i = 0; i < items.length; i++) {
        const [pName, price, origPrice] = items[i];
        const slug = `${subSlug}-${i + 1}`;

        const existingProd = await Product.findOne({ slug });
        if (!existingProd && catDoc) {
          await Product.create({
            name: pName,
            slug,
            category: catDoc._id,
            categoryId: catSlug,
            subcategoryId: subSlug,
            subcategoryName: subName,
            price,
            originalPrice: origPrice,
            stock: 25 + i * 15,
            badge: i === 0 ? "BESTSELLER" : "GREAT VALUE",
            images: [img, img, img],
            description: `${pName} is engineered for daily high-performance audio, premium comfort and long-lasting battery life.`,
            specifications: [
              { label: "Category", value: subName },
              { label: "Connectivity", value: "Bluetooth v5.3 / USB-C Fast Pair" },
              { label: "Warranty", value: "1 Year Official Brand Warranty" },
            ],
            faqs: [
              {
                question: "Is this product covered by warranty?",
                answer: "Yes, all Sonic products include a 1-year replacement warranty.",
              },
            ],
            rating: Number((4.3 + (i % 3) * 0.2).toFixed(1)),
            reviews: 145 + i * 62,
          });
          addedProducts++;
        }
      }
    }
    console.log(`[Seeder] Seeded ${addedProducts} new products without deleting existing records.`);

    // 5. Banners
    let addedBanners = 0;
    for (const b of initialBanners) {
      const existingBanner = await Banner.findOne({ title: b.title });
      if (!existingBanner) {
        await Banner.create(b);
        addedBanners++;
      }
    }
    console.log(`[Seeder] Seeded ${addedBanners} new banners.`);
    console.log("[Seeder] Manual seed complete.");
  } catch (err) {
    console.error("[Seeder] Error executing manual seed:", err);
  } finally {
    await closeDB();
    process.exit(0);
  }
};

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase();
}
