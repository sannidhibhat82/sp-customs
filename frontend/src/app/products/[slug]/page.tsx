import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

// Server-side metadata generation for Open Graph (WhatsApp, Facebook, etc.)
type Props = {
  params: { slug: string };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://spcustoms.loca.lt';

async function getProduct(slug: string) {
  try {
    // Fetch by numeric ID
    if (/^\d+$/.test(slug)) {
      const res = await fetch(`${API_URL}/products/${slug}`, {
        next: { revalidate: 60 },
        cache: 'no-store',
      });
      if (res.ok) return res.json();
      return null;
    }
    // Fetch by slug (works for all products, including older ones beyond first page)
    const res = await fetch(`${API_URL}/products/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
      cache: 'no-store',
    });
    if (res.ok) return res.json();
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
  
  const imageUrl = product.id 
    ? `${API_URL}/images/serve/product/${product.id}`
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
