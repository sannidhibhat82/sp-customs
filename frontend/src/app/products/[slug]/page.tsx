import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

// Server-side metadata generation for Open Graph (WhatsApp, Facebook, etc.)
type Props = {
  params: { slug: string };
};

// Use localhost for server-side API calls (faster, no tunnel latency)
const SERVER_API_URL = 'http://localhost:8000/api';
// Use tunnel URL for public-facing URLs (OG images that WhatsApp will fetch)
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://spcustoms-api.loca.lt/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://spcustoms.loca.lt';

async function getProduct(slug: string) {
  try {
    // Try to fetch product by ID first
    if (/^\d+$/.test(slug)) {
      const res = await fetch(`${SERVER_API_URL}/products/${slug}`, {
        next: { revalidate: 60 }, // Cache for 60 seconds
        cache: 'no-store', // Disable cache for fresh data
      });
      if (res.ok) return res.json();
    }
    
    // Otherwise search by slug
    const res = await fetch(`${SERVER_API_URL}/products?is_active=true&page_size=100`, {
      next: { revalidate: 60 },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const product = data.items?.find(
        (p: any) => p.slug === slug || p.id.toString() === slug
      );
      if (product) {
        // Fetch full product details
        const detailRes = await fetch(`${SERVER_API_URL}/products/${product.id}`, {
          next: { revalidate: 60 },
          cache: 'no-store',
        });
        if (detailRes.ok) return detailRes.json();
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching product for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  
  if (!product) {
    return {
      title: 'Product Not Found | SP Customs',
      description: 'The product you are looking for could not be found.',
    };
  }

  const price = Number(product.price || 0).toLocaleString('en-IN');
  const description = product.short_description || product.description || `${product.name} - Premium car gadget available at SP Customs`;
  const productUrl = `${SITE_URL}/products/${product.slug || product.id}`;
  
  // Use the PUBLIC API URL for OG image (WhatsApp needs public access)
  const imageUrl = product.id 
    ? `${PUBLIC_API_URL}/images/serve/product/${product.id}`
    : `${SITE_URL}/logo.svg`;

  return {
    title: `${product.name} | SP Customs`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${product.name} - ₹${price}`,
      description: description.slice(0, 200),
      url: productUrl,
      siteName: 'SP Customs',
      images: [
        {
          url: imageUrl,
          width: 600,
          height: 600,
          alt: product.name,
        },
      ],
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} - ₹${price}`,
      description: description.slice(0, 200),
      images: [imageUrl],
    },
    other: {
      'product:price:amount': product.price?.toString() || '',
      'product:price:currency': 'INR',
      'product:availability': product.inventory?.quantity > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailClient slug={params.slug} />;
}
