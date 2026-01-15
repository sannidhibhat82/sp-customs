const { createCanvas } = require('canvas');

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

// Generate a PNG product image using canvas
function generateProductImagePNG(productName, color) {
  const width = 600;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Parse color
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 100, g: 100, b: 100 };
  };

  const rgb = hexToRgb(color);
  const darkerRgb = {
    r: Math.max(0, rgb.r - 50),
    g: Math.max(0, rgb.g - 50),
    b: Math.max(0, rgb.b - 50)
  };

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  gradient.addColorStop(1, `rgb(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // White card with shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  roundRect(ctx, 80, 120, 440, 360, 20);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Inner colored area
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
  roundRect(ctx, 100, 140, 400, 220, 12);
  ctx.fill();

  // Product icon circle
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
  ctx.beginPath();
  ctx.arc(300, 250, 70, 0, Math.PI * 2);
  ctx.fill();

  // Product icon (box/package shape)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(260, 225);
  ctx.lineTo(300, 185);
  ctx.lineTo(340, 225);
  ctx.lineTo(340, 285);
  ctx.lineTo(300, 315);
  ctx.lineTo(260, 285);
  ctx.closePath();
  ctx.fill();

  // Inner box lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 185);
  ctx.lineTo(300, 315);
  ctx.moveTo(260, 225);
  ctx.lineTo(300, 255);
  ctx.lineTo(340, 225);
  ctx.stroke();

  // Product name text
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Truncate product name if too long
  let displayName = productName;
  if (displayName.length > 28) {
    displayName = displayName.substring(0, 25) + '...';
  }
  ctx.fillText(displayName, 300, 410);

  // Brand text
  ctx.fillStyle = '#666666';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('SP Customs', 300, 445);

  // Decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(550, 50, 35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(50, 550, 45, 0, Math.PI * 2);
  ctx.fill();

  // Convert to base64 PNG
  const buffer = canvas.toBuffer('image/png');
  return 'data:image/png;base64,' + buffer.toString('base64');
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
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

async function deleteProductImages(productId) {
  const imagesRes = await fetch(`${API_URL}/images/product/${productId}`);
  const images = await imagesRes.json();
  
  for (const image of images) {
    await fetch(`${API_URL}/images/${image.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
  }
  return images.length;
}

async function addImageToProduct(productId, productName, categoryName) {
  const color = categoryColors[categoryName] || '#6366f1';
  const imageData = generateProductImagePNG(productName, color);
  
  const response = await fetch(`${API_URL}/images/product/${productId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${AUTH_TOKEN}` 
    },
    body: JSON.stringify({
      image_data: imageData,
      filename: `${productName.toLowerCase().replace(/\s+/g, '-')}.png`,
      content_type: 'image/png',
      is_primary: true,
      sort_order: 0,
    }),
  });
  
  if (response.ok) {
    console.log(`  ✓ Added PNG image to: ${productName}`);
    return true;
  } else {
    const text = await response.text();
    console.log(`  ✗ Failed to add image to ${productName}: ${text}`);
    return false;
  }
}

async function main() {
  console.log('🖼️  Updating product images to PNG format...\n');
  
  // Get auth token
  AUTH_TOKEN = await getAuthToken();
  console.log('✓ Authenticated\n');
  
  // Get all products
  const response = await fetch(`${API_URL}/products?page_size=100`);
  const data = await response.json();
  const products = data.items;
  
  console.log(`Found ${products.length} products\n`);
  
  let updated = 0;
  for (const product of products) {
    console.log(`Processing: ${product.name}`);
    
    // Delete existing images
    const deleted = await deleteProductImages(product.id);
    if (deleted > 0) {
      console.log(`  - Deleted ${deleted} existing image(s)`);
    }
    
    // Add new PNG image
    const categoryName = product.category?.name || 'Gadgets';
    const success = await addImageToProduct(product.id, product.name, categoryName);
    if (success) updated++;
    
    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log(`\n✅ Done! Updated ${updated} products with PNG images.`);
}

main().catch(console.error);
