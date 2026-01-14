#!/usr/bin/env node

/**
 * Update Instagram Reels - remove embed codes, prepare for thumbnail upload
 */

const API_URL = 'http://localhost:8000/api';

const reelsData = [
  {
    title: 'Featured Installation',
    instagram_url: 'https://www.instagram.com/reel/DTCrnrOkXhX/',
    views_count: '1.2K',
  },
  {
    title: 'SP Customs Work',
    instagram_url: 'https://www.instagram.com/reel/DSz4I72Ac4a/',
    views_count: '2.5K',
  },
  {
    title: 'Car Customization',
    instagram_url: 'https://www.instagram.com/reel/DSpwoRtgcx7/',
    views_count: '3.1K',
  },
  {
    title: 'Installation Video',
    instagram_url: 'https://www.instagram.com/reel/DQuAB3biJVU/',
    views_count: '890',
  },
];

async function login() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
  });
  const data = await response.json();
  return data.access_token;
}

async function updateReels() {
  console.log('📱 Updating Instagram Reels...\n');
  
  const token = await login();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // First, delete existing reels
  console.log('🗑️ Removing old reels...');
  const existingReels = await fetch(`${API_URL}/homepage/reels`).then(r => r.json());
  for (const reel of existingReels) {
    await fetch(`${API_URL}/homepage/reels/${reel.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`  Deleted: ${reel.title}`);
  }

  // Create new reels (without thumbnails - user will upload via admin)
  console.log('\n✨ Creating reels...');
  for (let i = 0; i < reelsData.length; i++) {
    const reel = reelsData[i];
    try {
      const res = await fetch(`${API_URL}/homepage/reels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: reel.title,
          instagram_url: reel.instagram_url,
          views_count: reel.views_count,
          is_active: true,
          sort_order: i,
        }),
      });
      if (res.ok) {
        console.log(`  ✅ Created: ${reel.title}`);
      } else {
        console.log(`  ⚠️ Failed: ${reel.title}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n✅ Done! Go to Admin → Homepage → Reels to upload thumbnails.');
}

updateReels().catch(console.error);
