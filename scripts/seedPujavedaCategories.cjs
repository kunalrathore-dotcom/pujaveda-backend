const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PUJAVEDA_CATEGORIES = [
  {
    name: 'Puja Items & Samagri',
    slug: 'puja-items',
    order: 1,
    subcategories: [
      { name: 'Daily Puja Essentials', slug: 'daily-puja-essentials' },
      { name: 'Dhoop & Agarbatti', slug: 'dhoop-agarbatti' },
      { name: 'Camphor & Pure Kapur', slug: 'camphor-pure-kapur' },
      { name: 'Roli, Chandan & Kumkum', slug: 'roli-chandan-kumkum' },
      { name: 'Gangajal & Sacred Itra', slug: 'gangajal-sacred-itra' },
      { name: 'Puja Ghee & Diya Batti', slug: 'puja-ghee-diya-batti' },
    ],
  },
  {
    name: 'Complete Puja Packages',
    slug: 'puja-packages',
    order: 2,
    subcategories: [
      { name: 'Satyanarayan Puja Kit', slug: 'satyanarayan-puja-kit' },
      { name: 'Griha Pravesh Samagri Kit', slug: 'griha-pravesh-kit' },
      { name: 'Navratri Special Puja Kit', slug: 'navratri-puja-kit' },
      { name: 'Diwali Mahalakshmi Kit', slug: 'diwali-mahalakshmi-kit' },
      { name: 'Rudrabhishek Complete Kit', slug: 'rudrabhishek-kit' },
    ],
  },
  {
    name: 'Samaskara Packages',
    slug: 'samaskara-packages',
    order: 3,
    subcategories: [
      { name: 'Namkaran Sanskar Kit', slug: 'namkaran-sanskar-kit' },
      { name: 'Mundan Sanskar Kit', slug: 'mundan-sanskar-kit' },
      { name: 'Janeu (Yajnopavita) Kit', slug: 'janeu-sanskar-kit' },
      { name: 'Vivah (Wedding) Puja Samagri', slug: 'vivah-puja-samagri' },
    ],
  },
  {
    name: 'Murtis & Divine Brass Idols',
    slug: 'murtis-idols',
    order: 4,
    subcategories: [
      { name: 'Brass Ganesha Idols', slug: 'brass-ganesha-idols' },
      { name: 'Maha Lakshmi Brass Idols', slug: 'mahalakshmi-brass-idols' },
      { name: 'Radha Krishna Murti', slug: 'radha-krishna-murti' },
      { name: 'Shiv Parvati & Nandi', slug: 'shiv-parvati-nandi' },
      { name: 'Panchmukhi Hanuman Murti', slug: 'panchmukhi-hanuman-murti' },
    ],
  },
  {
    name: 'Sacred Shankh',
    slug: 'shankh',
    order: 5,
    subcategories: [
      { name: 'Dakshinavarti Laxmi Shankh', slug: 'dakshinavarti-shankh' },
      { name: 'Vamavarti Blowing Shankh', slug: 'vamavarti-shankh' },
      { name: 'Ganesha Carved Shankh', slug: 'ganesha-shankh' },
      { name: 'Pure Brass Shankh Stands', slug: 'brass-shankh-stands' },
    ],
  },
  {
    name: 'Gopal Vastra & Poshak',
    slug: 'gopal-vastra',
    order: 6,
    subcategories: [
      { name: 'Laddu Gopal Designer Poshak', slug: 'laddu-gopal-poshak' },
      { name: 'Zari Mukut & Morpankh', slug: 'zari-mukut-morpankh' },
      { name: 'Miniature Bansuri & Kundal', slug: 'bansuri-kundal' },
      { name: 'Royal Wooden & Velvet Singhasan', slug: 'royal-singhasan' },
    ],
  },
  {
    name: 'Religious Books & Vedic Texts',
    slug: 'religious-books',
    order: 7,
    subcategories: [
      { name: 'Shrimad Bhagavad Gita', slug: 'bhagavad-gita' },
      { name: 'Shri Ramcharitmanas', slug: 'ramcharitmanas' },
      { name: 'Sundarkand & Hanuman Chalisa', slug: 'sundarkand-hanuman-chalisa' },
      { name: 'Sampoorna Vrat Katha Sangrah', slug: 'vrat-katha-sangrah' },
    ],
  },
  {
    name: 'Puja Utensils & Brass Vessels',
    slug: 'puja-utensils',
    order: 8,
    subcategories: [
      { name: 'Pure Brass Akhand Diya', slug: 'pure-brass-akhand-diya' },
      { name: 'Etched Brass Puja Thali Sets', slug: 'brass-puja-thali-sets' },
      { name: 'Panchamrit Patra & Achmani', slug: 'panchamrit-patra-achmani' },
      { name: 'Carved Brass Puja Ghanti', slug: 'brass-puja-ghanti' },
      { name: 'Heavy Copper Hawan Kund', slug: 'heavy-copper-hawan-kund' },
    ],
  },
  {
    name: 'Puja Planner & Pandit Services',
    slug: 'puja-planner',
    order: 9,
    subcategories: [
      { name: 'Shubh Muhurat & Pandit Consultation', slug: 'shubh-muhurat-consultation' },
      { name: 'Customized Pandit Samagri Verification', slug: 'custom-pandit-verification' },
      { name: 'Varanasi & Haridwar Temple Sankalp', slug: 'temple-sankalp-seva' },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');
  const col = mongoose.connection.collection('categories');

  for (const cat of PUJAVEDA_CATEGORIES) {
    const subcats = cat.subcategories.map(s => ({
      _id: new mongoose.Types.ObjectId(),
      name: s.name,
      slug: s.slug,
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await col.updateOne(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          slug: cat.slug,
          image: '',
          imageId: '',
          isActive: true,
          order: cat.order,
          subcategories: subcats,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('Upserted category:', cat.name, `(${cat.slug})`);
  }

  const finalCount = await col.countDocuments({ isActive: true });
  console.log('Total active categories now in DB:', finalCount);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

