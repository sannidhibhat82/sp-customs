'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Share2,
  Heart,
  Check,
  X,
  Package,
  Tag,
  Layers,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc, generateWhatsAppLink, cn } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // For now, we'll use slug to get by ID (you'd want to add a getProductBySlug endpoint)
  const { data: products } = useQuery({
    queryKey: ['catalog-product', params.slug],
    queryFn: () => api.getProducts({ search: params.slug, page_size: 1 }),
  });

  const product = products?.items?.[0];

  const { data: fullProduct, isLoading } = useQuery({
    queryKey: ['product-detail', product?.id],
    queryFn: () => api.getProduct(product.id),
    enabled: !!product?.id,
  });

  if (isLoading || !fullProduct) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-wide py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-32 mb-8" />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-secondary rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 bg-secondary rounded w-3/4" />
                <div className="h-4 bg-secondary rounded w-1/4" />
                <div className="h-24 bg-secondary rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const images = fullProduct.images?.length > 0 
    ? fullProduct.images 
    : [{ image_data: null, alt_text: fullProduct.name }];

  const whatsAppLink = generateWhatsAppLink({
    name: fullProduct.name,
    sku: fullProduct.sku,
    price: fullProduct.price,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fullProduct.name,
          text: fullProduct.short_description || `Check out ${fullProduct.name} at SP Customs`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container-wide">
          <div className="flex items-center justify-between h-16">
            <Link href="/catalog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Catalog</span>
            </Link>
            
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">SP</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-wide py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div 
              className="relative aspect-square bg-secondary rounded-xl overflow-hidden cursor-zoom-in"
              onClick={() => setIsZoomed(true)}
            >
              {images[selectedImageIndex]?.image_data ? (
                <img
                  src={getImageSrc(images[selectedImageIndex].image_data)}
                  alt={images[selectedImageIndex].alt_text || fullProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-muted-foreground opacity-50" />
                </div>
              )}
              <button className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors">
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors",
                      selectedImageIndex === index ? "border-primary" : "border-transparent"
                    )}
                  >
                    {img.image_data ? (
                      <img
                        src={getImageSrc(img.thumbnail_data || img.image_data)}
                        alt={img.alt_text || `Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/catalog" className="hover:text-foreground">Catalog</Link>
              {fullProduct.category && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <Link 
                    href={`/catalog?category=${fullProduct.category.id}`}
                    className="hover:text-foreground"
                  >
                    {fullProduct.category.name}
                  </Link>
                </>
              )}
            </div>

            {/* Brand */}
            {fullProduct.brand && (
              <Link 
                href={`/catalog?brand=${fullProduct.brand.id}`}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Tag className="w-4 h-4" />
                {fullProduct.brand.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold">{fullProduct.name}</h1>

            {/* SKU */}
            <p className="text-muted-foreground">SKU: {fullProduct.sku}</p>

            {/* Price */}
            <div className="flex items-center gap-4">
              {fullProduct.price ? (
                <>
                  <span className="text-3xl font-bold">{formatCurrency(fullProduct.price)}</span>
                  {fullProduct.compare_at_price && (
                    <span className="text-xl text-muted-foreground line-through">
                      {formatCurrency(fullProduct.compare_at_price)}
                    </span>
                  )}
                  {fullProduct.compare_at_price && (
                    <span className="badge badge-success">
                      {Math.round((1 - fullProduct.price / fullProduct.compare_at_price) * 100)}% OFF
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xl text-muted-foreground">Contact for price</span>
              )}
            </div>

            {/* Stock Status */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
              fullProduct.inventory?.is_in_stock 
                ? "bg-green-500/10 text-green-400" 
                : "bg-red-500/10 text-red-400"
            )}>
              {fullProduct.inventory?.is_in_stock ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>In Stock</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span>Out of Stock</span>
                </>
              )}
            </div>

            {/* Description */}
            {fullProduct.description && (
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">{fullProduct.description}</p>
              </div>
            )}

            {/* Features */}
            {fullProduct.features && fullProduct.features.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Features</h3>
                <ul className="space-y-2">
                  {fullProduct.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Attributes/Specifications */}
            {Object.keys(fullProduct.attributes || {}).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Specifications</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(fullProduct.attributes).map(([key, value]) => (
                    <div key={key} className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">{key}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href={whatsAppLink} target="_blank" className="flex-1">
                <Button size="lg" className="w-full">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enquire on WhatsApp
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={handleShare}>
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setIsZoomed(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 p-2 text-white/70 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  className="absolute right-4 p-2 text-white/70 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev + 1) % images.length);
                  }}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            <motion.img
              key={selectedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={getImageSrc(images[selectedImageIndex]?.image_data)}
              alt={fullProduct.name}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

