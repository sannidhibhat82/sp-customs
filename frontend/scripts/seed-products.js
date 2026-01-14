const API_URL = 'http://localhost:8000/api';
let AUTH_TOKEN = '';

async function getAuthToken() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
  });
  const data = await response.json();
  return data.access_token;
}

// Generate a simple colored placeholder image as base64
function generatePlaceholderImage(text, bgColor) {
  // This creates a simple SVG that can be used as placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bgColor}"/>
    <text x="200" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const categories = [
  { name: 'Car Audio', description: 'Premium car audio systems and speakers', color: '#f97316' },
  { name: 'Dash Cameras', description: 'High-quality dash cameras for safety and security', color: '#3b82f6' },
  { name: 'LED Lighting', description: 'Interior and exterior LED lighting solutions', color: '#22c55e' },
  { name: 'Phone Mounts', description: 'Secure phone holders and mounts for vehicles', color: '#a855f7' },
  { name: 'Car Accessories', description: 'Essential car accessories and gadgets', color: '#ef4444' },
];

const brands = [
  { name: 'JBL', description: 'Premium audio equipment', website: 'https://www.jbl.com' },
  { name: 'Pioneer', description: 'Innovative car electronics', website: 'https://www.pioneer.com' },
  { name: 'Nextbase', description: 'Leading dash camera manufacturer', website: 'https://www.nextbase.com' },
  { name: 'Philips', description: 'Quality automotive lighting', website: 'https://www.philips.com' },
  { name: 'Spigen', description: 'Premium phone accessories', website: 'https://www.spigen.com' },
  { name: 'Baseus', description: 'Smart car accessories', website: 'https://www.baseus.com' },
];

const products = [
  // Car Audio (4 products)
  { name: 'JBL Stage 600C Component Speakers', category: 'Car Audio', brand: 'JBL', price: 8999, compare_at: 12999, description: 'Premium 6.5" component speakers with 150W RMS power. Crystal clear highs and deep bass.', features: ['150W RMS Power', '6.5" Woofer', 'Crossover Included', 'Easy Installation'] },
  { name: 'Pioneer DEH-S1250UB Car Stereo', category: 'Car Audio', brand: 'Pioneer', price: 5499, compare_at: 7999, description: 'Single DIN car stereo with USB, AUX, and FM radio. MOSFET 50Wx4 amplifier.', features: ['USB & AUX Input', 'FM Radio', '50W x 4 Output', 'Remote Control'] },
  { name: 'JBL BassPro 12 Subwoofer', category: 'Car Audio', brand: 'JBL', price: 15999, compare_at: 21999, description: '12" powered subwoofer with built-in amplifier. 450W peak power for deep bass.', features: ['450W Peak Power', 'Built-in Amplifier', 'Compact Design', 'Bass Remote'] },
  { name: 'Pioneer TS-A1670F Coaxial Speakers', category: 'Car Audio', brand: 'Pioneer', price: 3999, compare_at: 5499, description: '3-way coaxial speakers with 320W max power. Perfect upgrade for factory speakers.', features: ['320W Max Power', '3-Way Design', 'Carbon/Mica Cone', 'Easy Install'] },
  
  // Dash Cameras (4 products)
  { name: 'Nextbase 622GW 4K Dash Cam', category: 'Dash Cameras', brand: 'Nextbase', price: 24999, compare_at: 32999, description: '4K UHD dash camera with GPS, WiFi, and Alexa built-in. Image stabilization for smooth footage.', features: ['4K Recording', 'GPS Tracking', 'WiFi & Alexa', 'Parking Mode'] },
  { name: 'Nextbase 322GW Full HD Dash Cam', category: 'Dash Cameras', brand: 'Nextbase', price: 12999, compare_at: 16999, description: 'Full HD dash camera with GPS and WiFi. Compact design with wide 140° viewing angle.', features: ['1080p Full HD', 'GPS Built-in', 'WiFi Connectivity', '140° Wide Angle'] },
  { name: 'Philips GoSure ADR820 Dash Cam', category: 'Dash Cameras', brand: 'Philips', price: 8999, compare_at: 11999, description: 'Dual channel dash camera for front and rear recording. Night vision enabled.', features: ['Dual Channel', 'Night Vision', 'Loop Recording', 'G-Sensor'] },
  { name: 'Baseus 1080P Mirror Dash Cam', category: 'Dash Cameras', brand: 'Baseus', price: 5999, compare_at: 8499, description: 'Rear view mirror style dash camera with backup camera. Easy installation.', features: ['Mirror Design', 'Backup Camera', 'Touch Screen', 'Parking Assist'] },
  
  // LED Lighting (4 products)
  { name: 'Philips Ultinon Pro LED Headlights', category: 'LED Lighting', brand: 'Philips', price: 7999, compare_at: 10999, description: 'H4 LED headlight bulbs with 200% more brightness. Plug and play installation.', features: ['200% Brighter', 'H4 Fitment', 'Plug & Play', '6000K White'] },
  { name: 'Baseus RGB Interior LED Strip', category: 'LED Lighting', brand: 'Baseus', price: 2499, compare_at: 3999, description: 'Multi-color interior LED strip with app control. Music sync and voice control.', features: ['RGB Colors', 'App Control', 'Music Sync', 'Voice Control'] },
  { name: 'Philips LED Fog Lamps', category: 'LED Lighting', brand: 'Philips', price: 4999, compare_at: 6999, description: 'High performance LED fog lamps. All-weather visibility with yellow light output.', features: ['3000K Yellow', 'All-Weather', 'E-Marked', 'Easy Install'] },
  { name: 'JBL Party Light LED', category: 'LED Lighting', brand: 'JBL', price: 1999, compare_at: 2999, description: 'Portable LED party light for car interior. USB powered with multiple patterns.', features: ['USB Powered', 'Multiple Patterns', 'Portable', 'Sound Reactive'] },
  
  // Phone Mounts (4 products)
  { name: 'Spigen OneTap Pro MagSafe Mount', category: 'Phone Mounts', brand: 'Spigen', price: 3499, compare_at: 4999, description: 'MagSafe compatible car mount with strong magnets. One-tap attachment and release.', features: ['MagSafe Compatible', 'Strong Magnets', 'One-Tap Release', '360° Rotation'] },
  { name: 'Baseus Gravity Phone Holder', category: 'Phone Mounts', brand: 'Baseus', price: 1299, compare_at: 1999, description: 'Auto-clamping gravity phone holder. Works with phones 4.7" to 6.5".', features: ['Auto Clamp', 'Gravity Lock', 'Universal Fit', 'Air Vent Mount'] },
  { name: 'Spigen Wireless Charging Mount', category: 'Phone Mounts', brand: 'Spigen', price: 4999, compare_at: 6499, description: '15W wireless charging car mount. Qi certified with auto-clamping mechanism.', features: ['15W Wireless', 'Qi Certified', 'Auto Clamp', 'LED Indicator'] },
  { name: 'Baseus Dashboard Tablet Mount', category: 'Phone Mounts', brand: 'Baseus', price: 2499, compare_at: 3499, description: 'Large tablet and phone mount for dashboard. Holds devices up to 12 inches.', features: ['Up to 12"', 'Dashboard Mount', 'Adjustable Arm', 'Strong Suction'] },
  
  // Car Accessories (4 products)
  { name: 'Pioneer USB Car Charger 65W', category: 'Car Accessories', brand: 'Pioneer', price: 1499, compare_at: 2299, description: '65W dual port USB-C car charger. Fast charging for phones and laptops.', features: ['65W Total', 'USB-C & USB-A', 'Fast Charge', 'Compact Design'] },
  { name: 'Baseus Car Vacuum Cleaner', category: 'Car Accessories', brand: 'Baseus', price: 2999, compare_at: 4499, description: 'Portable handheld car vacuum with powerful suction. Cordless with LED light.', features: ['Cordless', 'LED Light', 'HEPA Filter', 'Portable'] },
  { name: 'Philips Car Air Purifier', category: 'Car Accessories', brand: 'Philips', price: 8999, compare_at: 12999, description: 'HEPA air purifier for car interior. Removes 99.9% of particles and odors.', features: ['HEPA Filter', '99.9% Purification', 'Air Quality Display', 'Quiet Operation'] },
  { name: 'Spigen Car Seat Organizer', category: 'Car Accessories', brand: 'Spigen', price: 1999, compare_at: 2999, description: 'Premium leather seat back organizer. Multiple pockets and tablet holder.', features: ['Premium Leather', 'Multiple Pockets', 'Tablet Holder', 'Easy Install'] },
];

async function createCategory(cat) {
  const imageData = generatePlaceholderImage(cat.name, cat.color);
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
    body: JSON.stringify({
      name: cat.name,
      description: cat.description,
      is_active: true,
      is_featured: true,
      image_data: imageData,
    }),
  });
  if (response.ok) {
    const data = await response.json();
    console.log(`✓ Created category: ${cat.name} (ID: ${data.id})`);
    return data;
  } else {
    const text = await response.text();
    console.log(`✗ Failed to create category ${cat.name}: ${text}`);
    return null;
  }
}

async function createBrand(brand) {
  const logoData = generatePlaceholderImage(brand.name, '#1f2937');
  const response = await fetch(`${API_URL}/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
    body: JSON.stringify({
      name: brand.name,
      description: brand.description,
      website: brand.website,
      is_active: true,
      is_featured: true,
      logo_data: logoData,
    }),
  });
  if (response.ok) {
    const data = await response.json();
    console.log(`✓ Created brand: ${brand.name} (ID: ${data.id})`);
    return data;
  } else {
    const text = await response.text();
    console.log(`✗ Failed to create brand ${brand.name}: ${text}`);
    return null;
  }
}

async function createProduct(product, categoryMap, brandMap) {
  const categoryId = categoryMap[product.category];
  const brandId = brandMap[product.brand];
  
  if (!categoryId || !brandId) {
    console.log(`✗ Skipping ${product.name}: Missing category or brand`);
    return null;
  }
  
  // Generate product image
  const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const imageData = generatePlaceholderImage(product.name.slice(0, 20), color);
  
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
    body: JSON.stringify({
      name: product.name,
      sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      description: product.description,
      short_description: product.description.slice(0, 100),
      price: product.price,
      compare_at_price: product.compare_at,
      cost: Math.round(product.price * 0.6),
      category_id: categoryId,
      brand_id: brandId,
      is_active: true,
      is_featured: Math.random() > 0.5,
      is_new: Math.random() > 0.7,
      features: product.features,
      images: [{ image_data: imageData, is_primary: true, sort_order: 0 }],
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`✓ Created product: ${product.name}`);
    return data;
  } else {
    const text = await response.text();
    console.log(`✗ Failed to create product ${product.name}: ${text}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting product seeding...\n');
  
  // Get auth token
  console.log('🔑 Getting auth token...');
  AUTH_TOKEN = await getAuthToken();
  console.log('✓ Authenticated\n');
  
  // Get existing categories
  const existingCategoriesRes = await fetch(`${API_URL}/categories`);
  const existingCategories = await existingCategoriesRes.json();
  const existingCategoryNames = existingCategories.map(c => c.name.toLowerCase());
  
  // Get existing brands
  const existingBrandsRes = await fetch(`${API_URL}/brands`);
  const existingBrands = await existingBrandsRes.json();
  const existingBrandNames = existingBrands.map(b => b.name.toLowerCase());
  
  // Build maps
  const categoryMap = {};
  const brandMap = {};
  
  // Add existing to maps
  existingCategories.forEach(c => categoryMap[c.name] = c.id);
  existingBrands.forEach(b => brandMap[b.name] = b.id);
  
  console.log('📂 Creating categories...');
  for (const cat of categories) {
    if (existingCategoryNames.includes(cat.name.toLowerCase())) {
      console.log(`  Skipping ${cat.name} (already exists)`);
      continue;
    }
    const created = await createCategory(cat);
    if (created) categoryMap[created.name] = created.id;
  }
  
  console.log('\n🏷️  Creating brands...');
  for (const brand of brands) {
    if (existingBrandNames.includes(brand.name.toLowerCase())) {
      console.log(`  Skipping ${brand.name} (already exists)`);
      continue;
    }
    const created = await createBrand(brand);
    if (created) brandMap[created.name] = created.id;
  }
  
  console.log('\n📦 Creating products...');
  let created = 0;
  for (const product of products) {
    const result = await createProduct(product, categoryMap, brandMap);
    if (result) created++;
    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n✅ Done! Created ${created} products.`);
}

main().catch(console.error);
