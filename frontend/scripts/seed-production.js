#!/usr/bin/env node

/**
 * Production Seed Script
 * 
 * Creates basic data for a fresh production deployment:
 * - 2 Categories (Vehicle Gadgets related)
 * - 2 Brands (Vehicle Gadgets related)
 * - 4 Products (different scenarios: with variants, without, featured, etc.)
 * - Homepage Content (banners, testimonials, reels, FAQs, settings)
 * 
 * Usage: node scripts/seed-production.js
 * 
 * IMPORTANT: Run this only once on a fresh database!
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let AUTH_TOKEN = '';

// ============ Utility Functions ============

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${ADMIN_USERNAME}&password=${ADMIN_PASSWORD}`,
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const data = await response.json();
    AUTH_TOKEN = data.access_token;
    console.log('✅ Login successful\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

function generatePlaceholderImage(text, bgColor = '#1f2937') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bgColor}"/>
    <text x="200" y="200" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${text.slice(0, 25)}</text>
  </svg>`;
  return Buffer.from(svg).toString('base64');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ Data Definitions ============

const categories = [
  {
    name: 'Car Electronics',
    description: 'Premium electronic gadgets and accessories for your vehicle. Dash cameras, GPS systems, and more.',
    color: '#3b82f6',
    is_featured: true,
  },
  {
    name: 'Interior Accessories',
    description: 'Enhance your car interior with premium accessories. Ambient lighting, seat covers, and organizers.',
    color: '#22c55e',
    is_featured: true,
  },
];

const brands = [
  {
    name: 'AutoTech Pro',
    description: 'Leading manufacturer of premium car electronics and smart gadgets. Known for quality and innovation.',
    website: 'https://autotechpro.example.com',
    is_featured: true,
  },
  {
    name: 'DriveStyle',
    description: 'Premium car interior accessories brand. Style meets functionality for modern vehicles.',
    website: 'https://drivestyle.example.com',
    is_featured: true,
  },
];

// Products with different scenarios
const products = [
  // Product 1: With Color Variants (Dash Cam)
  {
    name: '4K Smart Dash Camera',
    description: 'Ultra HD 4K dash camera with GPS, WiFi connectivity, and night vision. Features parking mode, G-sensor, and loop recording. Perfect for documenting your drives and ensuring safety.',
    short_description: '4K dash cam with GPS, WiFi, and night vision',
    price: 8999,
    compare_at_price: 12999,
    category: 'Car Electronics',
    brand: 'AutoTech Pro',
    features: ['4K Ultra HD Recording', 'GPS Tracking', 'WiFi Connectivity', 'Night Vision', 'Parking Mode', 'G-Sensor'],
    is_featured: true,
    is_new: true,
    initial_quantity: 25,
    hasVariants: true,
    variants: [
      { name: 'Midnight Black', options: { Color: 'Black' }, price: 8999 },
      { name: 'Silver Grey', options: { Color: 'Grey' }, price: 8999 },
      { name: 'Navy Blue', options: { Color: 'Blue' }, price: 9499 },
    ],
  },
  // Product 2: No Variants (GPS Navigator)
  {
    name: '7-inch GPS Navigator',
    description: 'Large 7-inch touchscreen GPS navigator with lifetime map updates. Features voice guidance, speed camera alerts, and truck/car modes. Easy to install on any vehicle.',
    short_description: '7-inch GPS with lifetime map updates',
    price: 5999,
    compare_at_price: 7999,
    category: 'Car Electronics',
    brand: 'AutoTech Pro',
    features: ['7-inch HD Screen', 'Lifetime Maps', 'Voice Guidance', 'Speed Camera Alerts', 'Multiple Vehicle Modes'],
    is_featured: true,
    is_new: false,
    initial_quantity: 15,
    hasVariants: false,
  },
  // Product 3: Interior product with size variants
  {
    name: 'RGB Ambient Interior Light Kit',
    description: 'Transform your car interior with stunning RGB ambient lighting. App-controlled with music sync and voice control. Easy installation with adhesive strips.',
    short_description: 'App-controlled RGB interior lighting',
    price: 2499,
    compare_at_price: 3999,
    category: 'Interior Accessories',
    brand: 'DriveStyle',
    features: ['16 Million Colors', 'App Control', 'Music Sync', 'Voice Control', 'Easy Installation'],
    is_featured: false,
    is_new: true,
    initial_quantity: 50,
    hasVariants: true,
    variants: [
      { name: '4-Strip Basic', options: { Size: '4 Strips' }, price: 2499 },
      { name: '6-Strip Premium', options: { Size: '6 Strips' }, price: 3499 },
    ],
  },
  // Product 4: Simple accessory, no variants
  {
    name: 'Premium Leather Seat Organizer',
    description: 'High-quality leather seat back organizer with multiple pockets for tablets, bottles, and essentials. Universal fit for all vehicles.',
    short_description: 'Leather seat organizer with tablet holder',
    price: 1999,
    compare_at_price: 2999,
    category: 'Interior Accessories',
    brand: 'DriveStyle',
    features: ['Premium Leather', 'Tablet Holder', 'Multiple Pockets', 'Universal Fit', 'Easy Install'],
    is_featured: true,
    is_new: false,
    initial_quantity: 30,
    hasVariants: false,
  },
];

// Homepage Content
const homepageContent = {
  banners: [
    {
      title: 'Premium Car Gadgets',
      subtitle: 'Transform Your Ride',
      description: 'Discover our collection of high-quality vehicle accessories',
      cta_text: 'Shop Now',
      cta_link: '/products',
      gradient_from: 'orange-500',
      gradient_to: 'red-500',
      is_active: true,
      sort_order: 0,
    },
    {
      title: 'New Arrivals',
      subtitle: 'Latest Tech',
      description: 'Check out our newest car electronics and gadgets',
      cta_text: 'Explore',
      cta_link: '/products?is_new=true',
      gradient_from: 'blue-500',
      gradient_to: 'purple-500',
      is_active: true,
      sort_order: 1,
    },
  ],
  testimonials: [
    {
      customer_name: 'Rahul Sharma',
      customer_role: 'BMW Owner',
      rating: 5,
      review_text: 'Excellent quality products! The dash camera I bought works perfectly. Great customer service too.',
      is_featured: true,
      is_active: true,
      sort_order: 0,
    },
    {
      customer_name: 'Priya Patel',
      customer_role: 'Honda Owner',
      rating: 5,
      review_text: 'The ambient lighting kit transformed my car interior. Easy installation and looks amazing!',
      is_featured: true,
      is_active: true,
      sort_order: 1,
    },
    {
      customer_name: 'Amit Kumar',
      customer_role: 'Toyota Owner',
      rating: 4,
      review_text: 'Good variety of products at reasonable prices. Fast delivery and proper packaging.',
      is_featured: false,
      is_active: true,
      sort_order: 2,
    },
  ],
  reels: [
    {
      title: 'Dash Cam Setup',
      instagram_url: 'https://instagram.com/spcustoms',
      views_count: '5.2K',
      icon_emoji: '📹',
      gradient_from: 'rose-500',
      gradient_to: 'pink-600',
      is_active: true,
      sort_order: 0,
    },
    {
      title: 'LED Installation',
      instagram_url: 'https://instagram.com/spcustoms',
      views_count: '3.8K',
      icon_emoji: '💡',
      gradient_from: 'violet-500',
      gradient_to: 'purple-600',
      is_active: true,
      sort_order: 1,
    },
    {
      title: 'Product Review',
      instagram_url: 'https://instagram.com/spcustoms',
      views_count: '2.5K',
      icon_emoji: '⭐',
      gradient_from: 'amber-500',
      gradient_to: 'orange-600',
      is_active: true,
      sort_order: 2,
    },
  ],
  faqCategories: [
    {
      name: 'Orders & Shipping',
      description: 'Questions about ordering and delivery',
      icon: 'package',
      sort_order: 0,
      questions: [
        { question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days. Express shipping is available for 1-2 day delivery.', sort_order: 0 },
        { question: 'Do you offer free shipping?', answer: 'Yes! We offer free shipping on orders above ₹2,000.', sort_order: 1 },
        { question: 'Can I track my order?', answer: 'Yes, you will receive a tracking number via email once your order ships.', sort_order: 2 },
      ],
    },
    {
      name: 'Products & Installation',
      description: 'Questions about our products',
      icon: 'tool',
      sort_order: 1,
      questions: [
        { question: 'Do you provide installation services?', answer: 'Yes, we offer professional installation services for select products. Contact us for details.', sort_order: 0 },
        { question: 'Are your products genuine?', answer: 'Absolutely! We only sell 100% genuine products with manufacturer warranty.', sort_order: 1 },
        { question: 'What is your return policy?', answer: 'We offer a 7-day return policy for unused products in original packaging.', sort_order: 2 },
      ],
    },
  ],
  settings: [
    { key: 'store_name', value: 'SP Customs', description: 'Store name displayed on the website' },
    { key: 'store_tagline', value: 'Premium Vehicle Gadgets', description: 'Store tagline' },
    { key: 'contact_email', value: 'contact@spcustoms.com', description: 'Contact email address' },
    { key: 'contact_phone', value: '+91 9876543210', description: 'Contact phone number' },
    { key: 'whatsapp_number', value: '919876543210', description: 'WhatsApp number for inquiries' },
    { key: 'instagram_url', value: 'https://instagram.com/spcustoms', description: 'Instagram profile URL' },
    { key: 'address', value: 'Bangalore, Karnataka, India', description: 'Store address' },
  ],
};

// ============ Seeding Functions ============

async function createCategory(category) {
  const imageData = generatePlaceholderImage(category.name, category.color);
  
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: category.name,
      description: category.description,
      is_active: true,
      is_featured: category.is_featured,
      image_data: imageData,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`  ✅ Category: ${category.name} (ID: ${data.id})`);
    return data;
  } else {
    const error = await response.text();
    console.log(`  ⚠️ Category ${category.name}: ${error}`);
    return null;
  }
}

async function createBrand(brand) {
  const logoData = generatePlaceholderImage(brand.name, '#374151');
  
  const response = await fetch(`${API_URL}/brands`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: brand.name,
      description: brand.description,
      website: brand.website,
      is_active: true,
      is_featured: brand.is_featured,
      logo_data: logoData,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`  ✅ Brand: ${brand.name} (ID: ${data.id})`);
    return data;
  } else {
    const error = await response.text();
    console.log(`  ⚠️ Brand ${brand.name}: ${error}`);
    return null;
  }
}

async function createProduct(product, categoryMap, brandMap) {
  const categoryId = categoryMap[product.category];
  const brandId = brandMap[product.brand];
  
  if (!categoryId || !brandId) {
    console.log(`  ⚠️ Skipping ${product.name}: Missing category or brand`);
    return null;
  }
  
  const imageData = generatePlaceholderImage(product.name, '#1e3a5f');
  
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      price: product.price,
      compare_at_price: product.compare_at_price,
      cost: Math.round(product.price * 0.6),
      category_id: categoryId,
      brand_id: brandId,
      is_active: true,
      is_featured: product.is_featured,
      is_new: product.is_new,
      features: product.features,
      initial_quantity: product.initial_quantity,
      images: [{ image_data: imageData, is_primary: true, sort_order: 0 }],
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`  ✅ Product: ${product.name} (ID: ${data.id})`);
    return data;
  } else {
    const error = await response.text();
    console.log(`  ⚠️ Product ${product.name}: ${error}`);
    return null;
  }
}

async function createVariant(productId, variant) {
  const response = await fetch(`${API_URL}/variants/product/${productId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: variant.name,
      options: variant.options,
      price: variant.price,
      is_active: true,
      initial_quantity: 10,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`    ✅ Variant: ${variant.name}`);
    return data;
  } else {
    const error = await response.text();
    console.log(`    ⚠️ Variant ${variant.name}: ${error}`);
    return null;
  }
}

async function createBanner(banner) {
  const response = await fetch(`${API_URL}/homepage/banners`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(banner),
  });
  
  if (response.ok) {
    console.log(`  ✅ Banner: ${banner.title}`);
    return true;
  } else {
    console.log(`  ⚠️ Banner ${banner.title}: Failed`);
    return false;
  }
}

async function createTestimonial(testimonial) {
  const response = await fetch(`${API_URL}/homepage/testimonials`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(testimonial),
  });
  
  if (response.ok) {
    console.log(`  ✅ Testimonial: ${testimonial.customer_name}`);
    return true;
  } else {
    console.log(`  ⚠️ Testimonial ${testimonial.customer_name}: Failed`);
    return false;
  }
}

async function createReel(reel) {
  const response = await fetch(`${API_URL}/homepage/reels`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reel),
  });
  
  if (response.ok) {
    console.log(`  ✅ Reel: ${reel.title}`);
    return true;
  } else {
    console.log(`  ⚠️ Reel ${reel.title}: Failed`);
    return false;
  }
}

async function createFAQCategory(category) {
  const response = await fetch(`${API_URL}/homepage/faq-categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: category.name,
      description: category.description,
      icon: category.icon,
      sort_order: category.sort_order,
      is_active: true,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`  ✅ FAQ Category: ${category.name}`);
    return data;
  } else {
    console.log(`  ⚠️ FAQ Category ${category.name}: Failed`);
    return null;
  }
}

async function createFAQQuestion(categoryId, question) {
  const response = await fetch(`${API_URL}/homepage/faq-questions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      category_id: categoryId,
      question: question.question,
      answer: question.answer,
      sort_order: question.sort_order,
      is_active: true,
    }),
  });
  
  if (response.ok) {
    console.log(`    ✅ Q: ${question.question.slice(0, 40)}...`);
    return true;
  } else {
    console.log(`    ⚠️ Question: Failed`);
    return false;
  }
}

async function createSetting(setting) {
  const response = await fetch(`${API_URL}/homepage/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      key: setting.key,
      value: setting.value,
      description: setting.description,
    }),
  });
  
  if (response.ok) {
    console.log(`  ✅ Setting: ${setting.key}`);
    return true;
  } else {
    console.log(`  ⚠️ Setting ${setting.key}: Failed`);
    return false;
  }
}

async function createDealOfDay(productId, productName, price) {
  const response = await fetch(`${API_URL}/homepage/deals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      product_id: productId,
      title: 'Deal of the Day',
      description: 'Limited time offer on premium car accessories!',
      discount_percentage: 30,
      deal_price: Math.round(price * 0.7),
      original_price: price,
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      is_active: true,
    }),
  });
  
  if (response.ok) {
    console.log(`  ✅ Deal of the Day: ${productName}`);
    return true;
  } else {
    console.log(`  ⚠️ Deal of the Day: Failed`);
    return false;
  }
}

// ============ Main Function ============

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║       SP Customs - Production Seed Script             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n❌ Cannot proceed without authentication.');
    process.exit(1);
  }
  
  const categoryMap = {};
  const brandMap = {};
  let featuredProductId = null;
  let featuredProductPrice = null;
  
  // ============ Create Categories ============
  console.log('📂 Creating Categories...');
  for (const category of categories) {
    const created = await createCategory(category);
    if (created) {
      categoryMap[category.name] = created.id;
    }
    await delay(100);
  }
  
  // ============ Create Brands ============
  console.log('\n🏷️ Creating Brands...');
  for (const brand of brands) {
    const created = await createBrand(brand);
    if (created) {
      brandMap[brand.name] = created.id;
    }
    await delay(100);
  }
  
  // ============ Create Products ============
  console.log('\n📦 Creating Products...');
  for (const product of products) {
    const created = await createProduct(product, categoryMap, brandMap);
    
    if (created) {
      // Save first featured product for deal
      if (product.is_featured && !featuredProductId) {
        featuredProductId = created.id;
        featuredProductPrice = product.compare_at_price || product.price;
      }
      
      // Create variants if any
      if (product.hasVariants && product.variants) {
        console.log(`  📋 Creating variants for ${product.name}...`);
        for (const variant of product.variants) {
          await createVariant(created.id, variant);
          await delay(100);
        }
      }
    }
    await delay(200);
  }
  
  // ============ Create Homepage Content ============
  console.log('\n🏠 Creating Homepage Content...');
  
  // Banners
  console.log('\n  📢 Banners:');
  for (const banner of homepageContent.banners) {
    await createBanner(banner);
    await delay(100);
  }
  
  // Testimonials
  console.log('\n  ⭐ Testimonials:');
  for (const testimonial of homepageContent.testimonials) {
    await createTestimonial(testimonial);
    await delay(100);
  }
  
  // Reels
  console.log('\n  📱 Instagram Reels:');
  for (const reel of homepageContent.reels) {
    await createReel(reel);
    await delay(100);
  }
  
  // FAQ Categories and Questions
  console.log('\n  ❓ FAQs:');
  for (const faqCategory of homepageContent.faqCategories) {
    const created = await createFAQCategory(faqCategory);
    if (created) {
      for (const question of faqCategory.questions) {
        await createFAQQuestion(created.id, question);
        await delay(50);
      }
    }
    await delay(100);
  }
  
  // Settings
  console.log('\n  ⚙️ Store Settings:');
  for (const setting of homepageContent.settings) {
    await createSetting(setting);
    await delay(50);
  }
  
  // Deal of the Day
  if (featuredProductId) {
    console.log('\n  🏷️ Deal of the Day:');
    await createDealOfDay(featuredProductId, 'Featured Product', featuredProductPrice);
  }
  
  // ============ Summary ============
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                   Seeding Complete!                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n📊 Summary:');
  console.log(`   • Categories: ${Object.keys(categoryMap).length}`);
  console.log(`   • Brands: ${Object.keys(brandMap).length}`);
  console.log(`   • Products: ${products.length}`);
  console.log(`   • Banners: ${homepageContent.banners.length}`);
  console.log(`   • Testimonials: ${homepageContent.testimonials.length}`);
  console.log(`   • Reels: ${homepageContent.reels.length}`);
  console.log(`   • FAQ Categories: ${homepageContent.faqCategories.length}`);
  console.log(`   • Settings: ${homepageContent.settings.length}`);
  
  console.log('\n🔗 Quick Links:');
  console.log('   • Admin Panel: http://localhost:3000/admin');
  console.log('   • Public Site: http://localhost:3000');
  console.log('   • Products: http://localhost:3000/products');
  console.log('\n✨ Done!');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
