'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Truck,
  Phone,
  Share2,
  Package,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { cn, WHATSAPP_NUMBER, getPhoneUrl } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// Helper function to get proper image src from base64 data
function getImageSrc(imageData: string | undefined): string | undefined {
  if (!imageData) return undefined;
  if (imageData.startsWith('data:')) return imageData;
  
  // Detect image type from base64 prefix
  if (imageData.startsWith('PHN2Z') || imageData.startsWith('PD94b')) {
    return `data:image/svg+xml;base64,${imageData}`;
  } else if (imageData.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${imageData}`;
  } else if (imageData.startsWith('iVBOR')) {
    return `data:image/png;base64,${imageData}`;
  } else if (imageData.startsWith('R0lGO')) {
    return `data:image/gif;base64,${imageData}`;
  } else if (imageData.startsWith('UklGR')) {
    return `data:image/webp;base64,${imageData}`;
  }
  return `data:image/jpeg;base64,${imageData}`;
}

// Color name to CSS color mapping
const colorMap: Record<string, string> = {
  'red': '#ef4444',
  'blue': '#3b82f6',
  'green': '#22c55e',
  'yellow': '#eab308',
  'orange': '#f97316',
  'purple': '#a855f7',
  'pink': '#ec4899',
  'black': '#171717',
  'white': '#ffffff',
  'gray': '#6b7280',
  'grey': '#6b7280',
  'brown': '#92400e',
  'gold': '#fbbf24',
  'silver': '#9ca3af',
  'navy': '#1e3a8a',
  'teal': '#14b8a6',
  'cyan': '#06b6d4',
  'lime': '#84cc16',
  'indigo': '#6366f1',
  'violet': '#8b5cf6',
  'rose': '#f43f5e',
  'sky': '#0ea5e9',
  'amber': '#f59e0b',
  'emerald': '#10b981',
};

function getColorValue(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#6b7280'; // Default to gray
}

interface ProductDetailClientProps {
  slug: string;
}

export default function ProductDetailClient({ slug }: ProductDetailClientProps) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Try to get product by ID or slug
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      // First try as ID
      if (/^\d+$/.test(slug)) {
        return api.getProduct(parseInt(slug));
      }
      // Otherwise search by name/slug
      const products = await api.getProducts({ is_active: true });
      const found = products.items.find(
        (p: any) => p.slug === slug || p.id.toString() === slug
      );
      if (found) return api.getProduct(found.id);
      throw new Error('Product not found');
    },
  });

  // Fetch variants for this product
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', product?.id],
    queryFn: () => api.getProductVariants(product!.id),
    enabled: !!product?.id,
  });

  // Get related products
  const { data: relatedData } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: () => api.getProducts({
      is_active: true,
      category_id: product?.category_id,
      page_size: 5,
    }),
    enabled: !!product?.category_id,
  });

  // Extract unique option types and values from variants
  const variantOptions = useMemo(() => {
    if (!variants.length) return {};
    
    const options: Record<string, string[]> = {};
    variants.forEach((v: any) => {
      if (v.options) {
        Object.entries(v.options).forEach(([key, value]) => {
          if (!options[key]) options[key] = [];
          if (!options[key].includes(value as string)) {
            options[key].push(value as string);
          }
        });
      }
    });
    return options;
  }, [variants]);

  // Find matching variant based on selected options
  useEffect(() => {
    if (!variants.length) return;
    
    const optionKeys = Object.keys(selectedOptions);
    if (optionKeys.length === 0) {
      // Select first variant as default
      setSelectedVariant(variants[0]);
      if (variants[0]?.options) {
        setSelectedOptions(variants[0].options);
      }
      return;
    }

    // Find variant that matches all selected options
    const matchingVariant = variants.find((v: any) => {
      if (!v.options) return false;
      return optionKeys.every(key => v.options[key] === selectedOptions[key]);
    });

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  }, [variants, selectedOptions]);

  // Reset image index when variant changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedVariant]);

  const relatedProducts = (relatedData?.items || []).filter(
    (p: any) => p.id !== product?.id
  ).slice(0, 4);

  // Determine which images to show - variant images if available, otherwise product images
  const displayImages = useMemo(() => {
    if (selectedVariant?.images?.length > 0) {
      return selectedVariant.images;
    }
    return product?.images || [];
  }, [selectedVariant, product]);

  // Determine price - variant price overrides product price
  const displayPrice = selectedVariant?.price_override ?? selectedVariant?.price ?? product?.price ?? 0;
  const displayComparePrice = selectedVariant?.compare_at_price_override ?? product?.compare_at_price;
  const displaySku = selectedVariant?.sku ?? product?.sku;

  const discount = displayComparePrice && Number(displayComparePrice) > Number(displayPrice)
    ? Math.round((1 - Number(displayPrice) / Number(displayComparePrice)) * 100)
    : 0;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.short_description || product?.description,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!', variant: 'success' });
    }
  };

  // Build WhatsApp message with product link and variant info
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const variantInfo = selectedVariant?.name ? ` - ${selectedVariant.name}` : '';
  const whatsappMessage = product
    ? `Hi! I'm interested in "${product.name}${variantInfo}" (₹${Number(displayPrice).toLocaleString('en-IN')}).

🔗 Product Link: ${productUrl}
${selectedVariant?.name ? `\n🎨 Selected: ${selectedVariant.name}` : ''}
Can you provide more details about this product?`
    : 'Hi! I want to enquire about a product.';

  // Check stock - variant inventory or product inventory
  const stockQuantity = selectedVariant?.inventory_quantity ?? product?.inventory?.quantity ?? 0;
  const isInStock = stockQuantity > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse grid lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-secondary/50 rounded-2xl" />
            <div className="space-y-6">
              <div className="h-4 bg-secondary/50 rounded w-1/4" />
              <div className="h-8 bg-secondary/50 rounded w-3/4" />
              <div className="h-6 bg-secondary/50 rounded w-1/3" />
              <div className="h-24 bg-secondary/50 rounded" />
              <div className="h-14 bg-secondary/50 rounded w-1/2" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="py-20">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/products">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="pt-24 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/products" className="hover:text-foreground">Products</Link>
            {product.category && (
              <>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/categories/${product.category.slug || product.category.id}`} className="hover:text-foreground">
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-card rounded-2xl overflow-hidden border border-border">
              {displayImages.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`${selectedVariant?.id}-${currentImageIndex}`}
                    src={getImageSrc(displayImages[currentImageIndex]?.image_data)}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="w-24 h-24 opacity-30" />
                </div>
              )}

              {/* Image Navigation */}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {discount > 0 && (
                  <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full">
                    {discount}% OFF
                  </span>
                )}
                {product.is_new && (
                  <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                    NEW
                  </span>
                )}
                {!isInStock && (
                  <span className="px-3 py-1 bg-gray-500 text-white text-sm font-semibold rounded-full">
                    OUT OF STOCK
                  </span>
                )}
              </div>

              {/* Share Button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {displayImages.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={cn(
                      "w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                      currentImageIndex === i ? "border-primary" : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src={getImageSrc(img.image_data)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Brand */}
            {product.brand && (
              <Link
                href={`/brands/${product.brand.slug || product.brand.id}`}
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                {product.brand.logo_data && (
                  <img
                    src={product.brand.logo_data.startsWith('data:') ? product.brand.logo_data : `data:image/jpeg;base64,${product.brand.logo_data}`}
                    alt={product.brand.name}
                    className="h-6 w-auto"
                  />
                )}
                {product.brand.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-primary">
                ₹{Number(displayPrice).toLocaleString('en-IN')}
              </span>
              {displayComparePrice && Number(displayComparePrice) > Number(displayPrice) && (
                <span className="text-xl text-muted-foreground line-through">
                  ₹{Number(displayComparePrice).toLocaleString('en-IN')}
                </span>
              )}
              {discount > 0 && (
                <span className="text-lg text-green-500 font-semibold">
                  Save ₹{(Number(displayComparePrice) - Number(displayPrice)).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-lg text-muted-foreground">
                {product.short_description}
              </p>
            )}

            {/* Variant Selection */}
            {variants.length > 0 && Object.keys(variantOptions).length > 0 && (
              <div className="space-y-4 pt-2">
                {Object.entries(variantOptions).map(([optionName, values]) => (
                  <div key={optionName}>
                    <label className="block text-sm font-medium mb-2">
                      {optionName}: <span className="text-primary">{selectedOptions[optionName] || 'Select'}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {optionName.toLowerCase() === 'color' ? (
                        // Color swatches
                        values.map((value) => {
                          const isSelected = selectedOptions[optionName] === value;
                          const colorHex = getColorValue(value);
                          const isLight = ['white', 'yellow', 'lime', 'cyan', 'gold', 'silver'].includes(value.toLowerCase());
                          
                          return (
                            <button
                              key={value}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [optionName]: value }))}
                              className={cn(
                                "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border hover:border-primary/50"
                              )}
                              style={{ backgroundColor: colorHex }}
                              title={value}
                            >
                              {isSelected && (
                                <Check className={cn("w-5 h-5", isLight ? "text-black" : "text-white")} />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        // Regular buttons for other options (Size, etc.)
                        values.map((value) => {
                          const isSelected = selectedOptions[optionName] === value;
                          return (
                            <button
                              key={value}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [optionName]: value }))}
                              className={cn(
                                "px-4 py-2 rounded-lg border-2 font-medium transition-all",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50 bg-card"
                              )}
                            >
                              {value}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}

                {/* Selected variant info */}
                {selectedVariant && (
                  <div className="text-sm text-muted-foreground pt-2">
                    <span className="font-medium">Selected:</span> {selectedVariant.name}
                    {selectedVariant.inventory_quantity !== undefined && (
                      <span className="ml-2">
                        • {selectedVariant.inventory_quantity > 0 
                            ? `${selectedVariant.inventory_quantity} in stock` 
                            : 'Out of stock'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SKU */}
            <p className="text-sm text-muted-foreground">
              SKU: <span className="font-mono">{displaySku}</span>
            </p>

            {/* Stock Status */}
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              isInStock ? "text-green-500" : "text-red-500"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isInStock ? "bg-green-500" : "bg-red-500"
              )} />
              {isInStock ? `In Stock (${stockQuantity} available)` : 'Out of Stock'}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                className="flex-1"
              >
                <Button
                  size="lg"
                  className="w-full text-lg h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enquire Now
                </Button>
              </Link>
              <a href={getPhoneUrl()}>
                <Button size="lg" variant="outline" className="h-14">
                  <Phone className="w-5 h-5 mr-2" />
                  Call Us
                </Button>
              </a>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              {[
                { icon: Shield, label: 'Warranty Included' },
                { icon: Truck, label: 'Fast Delivery' },
                { icon: Zap, label: 'Expert Installation' },
                { icon: Check, label: 'Quality Assured' },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{feature.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <div className="text-muted-foreground prose prose-sm max-w-none">
                  {product.description.split('\n').map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Features List */}
            {product.features && product.features.length > 0 && (
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-3">Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications / Attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-3">Specifications</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {Object.entries(product.attributes).map(([key, value], i) => (
                        <tr 
                          key={key}
                          className={i % 2 === 0 ? 'bg-secondary/30' : 'bg-transparent'}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/3">
                            {key}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {value as string}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold mb-8">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug || p.id}`}
                  className="group"
                >
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="bg-card rounded-xl overflow-hidden border border-border"
                  >
                    <div className="aspect-square bg-secondary/30 p-4">
                      {p.primary_image ? (
                        <img
                          src={getImageSrc(p.primary_image)}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-primary font-bold mt-2">
                        ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
