#!/usr/bin/env node

/**
 * Seed Homepage Content Script
 * Adds sample banners, testimonials, reels, and deals
 */

const API_URL = 'http://localhost:8000/api';

async function login() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
  });
  const data = await response.json();
  return data.access_token;
}

async function seedHomepage() {
  console.log('🌱 Seeding Homepage Content...\n');
  
  const token = await login();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 1. Seed Promo Banners
  console.log('📢 Creating Promo Banners...');
  const banners = [
    {
      title: 'Summer Sale',
      subtitle: 'Up to 40% Off',
      description: 'On all car interior accessories',
      cta_text: 'Shop Now',
      cta_link: '/products?sale=true',
      gradient_from: 'orange-600',
      gradient_to: 'red-600',
      is_active: true,
      sort_order: 0,
    },
    {
      title: 'Free Installation',
      subtitle: 'This Weekend Only',
      description: 'On orders above ₹5,000',
      cta_text: 'Learn More',
      cta_link: '/services',
      gradient_from: 'blue-600',
      gradient_to: 'purple-600',
      is_active: true,
      sort_order: 1,
    },
    {
      title: 'New Arrivals',
      subtitle: 'Just Dropped',
      description: 'Latest car tech gadgets',
      cta_text: 'Explore',
      cta_link: '/products?sort=newest',
      gradient_from: 'green-600',
      gradient_to: 'teal-600',
      is_active: true,
      sort_order: 2,
    },
  ];

  for (const banner of banners) {
    try {
      const res = await fetch(`${API_URL}/homepage/banners`, {
        method: 'POST',
        headers,
        body: JSON.stringify(banner),
      });
      if (res.ok) {
        console.log(`  ✅ Created banner: ${banner.title}`);
      } else {
        console.log(`  ⚠️ Failed to create banner: ${banner.title}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // 2. Seed Testimonials
  console.log('\n⭐ Creating Testimonials...');
  const testimonials = [
    {
      customer_name: 'Rajesh Kumar',
      customer_role: 'BMW Owner',
      rating: 5,
      review_text: 'Amazing quality products and professional installation. My car looks and feels completely upgraded! The team at SP Customs really knows their stuff.',
      is_featured: true,
      is_active: true,
      sort_order: 0,
    },
    {
      customer_name: 'Priya Sharma',
      customer_role: 'Mercedes Owner',
      rating: 5,
      review_text: 'SP Customs transformed my car interior. The ambient lighting they installed is absolutely stunning! Great attention to detail.',
      is_featured: true,
      is_active: true,
      sort_order: 1,
    },
    {
      customer_name: 'Amit Patel',
      customer_role: 'Audi Owner',
      rating: 5,
      review_text: 'Best car gadgets store in the city. Great collection, fair prices, and excellent after-sales service. Highly recommended!',
      is_featured: true,
      is_active: true,
      sort_order: 2,
    },
    {
      customer_name: 'Sneha Reddy',
      customer_role: 'Honda Owner',
      rating: 5,
      review_text: 'Got my dash cam and air purifier from SP Customs. Installation was quick and the products are working perfectly. Will definitely come back!',
      is_featured: false,
      is_active: true,
      sort_order: 3,
    },
    {
      customer_name: 'Vikram Singh',
      customer_role: 'Toyota Owner',
      rating: 4,
      review_text: 'Good variety of products and helpful staff. The car vacuum cleaner I bought is excellent. Only minor delay in installation.',
      is_featured: false,
      is_active: true,
      sort_order: 4,
    },
  ];

  for (const testimonial of testimonials) {
    try {
      const res = await fetch(`${API_URL}/homepage/testimonials`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testimonial),
      });
      if (res.ok) {
        console.log(`  ✅ Created testimonial: ${testimonial.customer_name}`);
      } else {
        console.log(`  ⚠️ Failed to create testimonial: ${testimonial.customer_name}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // 3. Seed Instagram Reels
  console.log('\n📱 Creating Instagram Reels...');
  const reels = [
    {
      title: 'Dash Cam Install',
      instagram_url: 'https://instagram.com/reel/dashcam',
      views_count: '12.5K',
      icon_emoji: '📹',
      gradient_from: 'rose-500',
      gradient_to: 'pink-600',
      is_active: true,
      sort_order: 0,
    },
    {
      title: 'LED Ambience',
      instagram_url: 'https://instagram.com/reel/ledambience',
      views_count: '8.2K',
      icon_emoji: '💡',
      gradient_from: 'violet-500',
      gradient_to: 'purple-600',
      is_active: true,
      sort_order: 1,
    },
    {
      title: 'Sound System',
      instagram_url: 'https://instagram.com/reel/soundsystem',
      views_count: '15.1K',
      icon_emoji: '🔊',
      gradient_from: 'blue-500',
      gradient_to: 'cyan-600',
      is_active: true,
      sort_order: 2,
    },
    {
      title: 'Air Purifier',
      instagram_url: 'https://instagram.com/reel/airpurifier',
      views_count: '9.8K',
      icon_emoji: '🌿',
      gradient_from: 'emerald-500',
      gradient_to: 'teal-600',
      is_active: true,
      sort_order: 3,
    },
  ];

  for (const reel of reels) {
    try {
      const res = await fetch(`${API_URL}/homepage/reels`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reel),
      });
      if (res.ok) {
        console.log(`  ✅ Created reel: ${reel.title}`);
      } else {
        console.log(`  ⚠️ Failed to create reel: ${reel.title}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  // 4. Create Deal of the Day
  console.log('\n🏷️ Creating Deal of the Day...');
  
  // First get a product to use as deal
  const productsRes = await fetch(`${API_URL}/products?page_size=1&is_active=true`);
  const productsData = await productsRes.json();
  const product = productsData.items?.[0];

  if (product) {
    const deal = {
      product_id: product.id,
      title: 'Deal of the Day',
      description: 'Get premium car accessories at unbeatable prices. Limited stock available!',
      discount_percentage: 40,
      deal_price: Math.round(product.price * 0.6),
      original_price: product.price,
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      is_active: true,
    };

    try {
      const res = await fetch(`${API_URL}/homepage/deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify(deal),
      });
      if (res.ok) {
        console.log(`  ✅ Created deal for: ${product.name}`);
      } else {
        const error = await res.text();
        console.log(`  ⚠️ Failed to create deal: ${error}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  } else {
    console.log('  ⚠️ No products available for deal');
  }

  console.log('\n✨ Homepage seeding complete!');
  console.log('\nView in admin: http://localhost:3000/admin/homepage');
  console.log('View public: http://localhost:3000/');
}

seedHomepage().catch(console.error);
