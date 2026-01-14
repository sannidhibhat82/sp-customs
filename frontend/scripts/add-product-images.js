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

// Generate a proper product image placeholder
function generateProductImage(productName, color) {
  // Create a more realistic looking product placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${darkenColor(color)};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <rect x="100" y="150" width="400" height="300" rx="20" fill="white" fill-opacity="0.95" filter="url(#shadow)"/>
    <rect x="120" y="170" width="360" height="200" rx="10" fill="${color}" fill-opacity="0.15"/>
    <circle cx="300" cy="270" r="60" fill="${color}" fill-opacity="0.3"/>
    <path d="M270 250 L300 220 L330 250 L330 290 L270 290 Z" fill="${color}"/>
    <rect x="280" y="295" width="40" height="20" fill="${color}" fill-opacity="0.8"/>
    <text x="300" y="420" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#333" text-anchor="middle">${truncateText(productName, 30)}</text>
    <text x="300" y="445" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">SP Customs</text>
    <circle cx="550" cy="50" r="30" fill="white" fill-opacity="0.2"/>
    <circle cx="50" cy="550" r="40" fill="white" fill-opacity="0.1"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function darkenColor(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - 40);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
  const b = Math.max(0, (num & 0x0000FF) - 40);
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

// Product-specific colors based on category
const categoryColors = {
  'Car Audio': '#f97316',
  'Dash Cameras': '#3b82f6', 
  'LED Lighting': '#22c55e',
  'Phone Mounts': '#a855f7',
  'Car Accessories': '#ef4444',
  'Gadgets': '#06b6d4',
  'speaker': '#ec4899',
};

async function addImageToProduct(productId, productName, categoryName) {
  const color = categoryColors[categoryName] || '#6366f1';
  const imageData = generateProductImage(productName, color);
  
  const response = await fetch(`${API_URL}/images/product/${productId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${AUTH_TOKEN}` 
    },
    body: JSON.stringify({
      image_data: imageData,
      filename: `${productName.toLowerCase().replace(/\s+/g, '-')}.svg`,
      content_type: 'image/svg+xml',
      is_primary: true,
      sort_order: 0,
    }),
  });
  
  if (response.ok) {
    console.log(`✓ Added image to: ${productName}`);
    return true;
  } else {
    const text = await response.text();
    console.log(`✗ Failed to add image to ${productName}: ${text}`);
    return false;
  }
}

async function main() {
  console.log('🖼️  Adding images to products...\n');
  
  // Get auth token
  AUTH_TOKEN = await getAuthToken();
  console.log('✓ Authenticated\n');
  
  // Get all products
  const response = await fetch(`${API_URL}/products?page_size=50`);
  const data = await response.json();
  const products = data.items;
  
  console.log(`Found ${products.length} products\n`);
  
  let updated = 0;
  for (const product of products) {
    // Check if product already has images
    const imagesRes = await fetch(`${API_URL}/images/product/${product.id}`);
    const images = await imagesRes.json();
    
    if (images.length > 0) {
      console.log(`  Skipping ${product.name} (already has ${images.length} image(s))`);
      continue;
    }
    
    const categoryName = product.category?.name || 'Gadgets';
    const success = await addImageToProduct(product.id, product.name, categoryName);
    if (success) updated++;
    
    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n✅ Done! Added images to ${updated} products.`);
}

main().catch(console.error);
