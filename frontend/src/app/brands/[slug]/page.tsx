'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Grid, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { useState } from 'react';

// Helper function to get proper image src from base64 data
function getImageSrc(imageData: string | undefined): string | undefined {
  if (!imageData) return undefined;
  if (imageData.startsWith('data:')) return imageData;
  if (imageData.startsWith('PHN2Z') || imageData.startsWith('PD94b')) {
    return `data:image/svg+xml;base64,${imageData}`;
  } else if (imageData.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${imageData}`;
  } else if (imageData.startsWith('iVBOR')) {
    return `data:image/png;base64,${imageData}`;
  }
  return `data:image/jpeg;base64,${imageData}`;
}

// Product Card Component
function ProductCard({ product }: { product: any }) {
  const imageData = product.primary_image || product.images?.[0]?.image_data;
  const discount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group relative bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="aspect-square bg-secondary/30 relative overflow-hidden">
        {imageData ? (
          <img
            src={getImageSrc(imageData)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
              {discount}% OFF
            </span>
          )}
          {product.is_new && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              NEW
            </span>
          )}
        </div>

        {/* Quick View */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/products/${product.slug || product.id}`}>
            <Button size="sm">View Details</Button>
          </Link>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-primary font-medium mb-1">
          {product.category?.name || 'SP Customs'}
        </p>
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">
            ₹{Number(product.price || 0).toLocaleString('en-IN')}
          </span>
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function BrandPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [sortBy, setSortBy] = useState('newest');

  // Fetch all brands to find the one matching the slug
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  const brand = brands?.find((b: any) => 
    b.slug === slug || b.name.toLowerCase().replace(/\s+/g, '-') === slug
  );

  // Fetch products for this brand
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['brand-products', brand?.id],
    queryFn: () => api.getProducts({ 
      is_active: true, 
      brand_id: brand?.id 
    }),
    enabled: !!brand?.id,
  });

  const products = productsData?.items || [];

  // Sort products
  const sortedProducts = [...products].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'price_low':
        return Number(a.price) - Number(b.price);
      case 'price_high':
        return Number(b.price) - Number(a.price);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/brands" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Brands
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            {brand?.logo_data && (
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white p-4 flex items-center justify-center">
                <img
                  src={getImageSrc(brand.logo_data)}
                  alt={brand?.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {brand?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mb-4">
                {brand?.description || `Explore products from ${slug.replace(/-/g, ' ')}`}
              </p>
              {brand?.website && (
                <a 
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  Visit Official Website
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-muted-foreground">
            {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
          </p>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 px-4 bg-card border border-border rounded-lg"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary/50" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-secondary/50 rounded w-1/3" />
                  <div className="h-5 bg-secondary/50 rounded w-2/3" />
                  <div className="h-6 bg-secondary/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary/50 flex items-center justify-center">
              <Grid className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              We don't have any products from this brand yet.
            </p>
            <Link href="/products">
              <Button>
                Browse All Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product: any, i: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
