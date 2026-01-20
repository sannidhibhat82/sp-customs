'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  X,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { cn, getWhatsAppUrl } from '@/lib/utils';

// Helper function to get proper image src from base64 data
function getImageSrc(imageData: string | undefined): string | undefined {
  if (!imageData) return undefined;
  if (imageData.startsWith('data:')) return imageData;
  
  // Detect image type from base64 prefix
  // SVG starts with PHN2Zy (base64 for "<svg")
  // JPEG starts with /9j/
  // PNG starts with iVBOR
  // GIF starts with R0lGO
  // WebP starts with UklGR
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
  // Default to JPEG for unknown types
  return `data:image/jpeg;base64,${imageData}`;
}

// Product Card
function ProductCard({ product, view }: { product: any; view: 'grid' | 'list' }) {
  // API returns primary_image directly for list view, or images array for detail view
  const imageData = product.primary_image || product.images?.[0]?.image_data;
  const discount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  if (view === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group flex gap-4 sm:gap-6 bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-colors"
      >
        {/* Image */}
        <Link href={`/products/${product.slug || product.id}`} className="w-32 sm:w-40 h-32 sm:h-40 bg-secondary/30 flex-shrink-0">
          {imageData ? (
            <img
              src={getImageSrc(imageData)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 py-3 pr-4 flex flex-col justify-between min-w-0">
          <div>
            <p className="text-xs sm:text-sm text-primary font-medium mb-0.5">
              {product.brand?.name || product.category?.name || 'SP Customs'}
            </p>
            <Link href={`/products/${product.slug || product.id}`}>
              <h3 className="text-base sm:text-lg font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                {product.name}
              </h3>
            </Link>
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 hidden sm:block">
              {product.short_description || product.description}
            </p>
          </div>

          {/* Price & Actions Row */}
          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-primary">
                ₹{Number(product.price || 0).toLocaleString('en-IN')}
              </span>
              {discount > 0 && (
                <span className="text-xs text-muted-foreground line-through hidden sm:inline">
                  ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                </span>
              )}
              {discount > 0 && (
                <span className="text-xs text-green-500 font-medium">{discount}% OFF</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/products/${product.slug || product.id}`}>
                <Button size="sm" variant="outline" className="h-8 px-3">
                  View
                </Button>
              </Link>
              <Link
                href={getWhatsAppUrl(`Hi! I'm interested in ${product.name}`)}
                target="_blank"
              >
                <Button size="sm" className="h-8 px-3 bg-green-600 hover:bg-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
          {product.is_featured && (
            <span className="px-2 py-1 bg-primary text-white text-xs font-semibold rounded-full">
              FEATURED
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Link href={`/products/${product.slug || product.id}`}>
            <Button size="sm">View Details</Button>
          </Link>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-primary font-medium mb-1">
          {product.brand?.name || product.category?.name || 'SP Customs'}
        </p>
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    tag: searchParams.get('tag') || '',  // Tag filter from URL
    sort: 'newest',
  });

  // Update search when URL params change
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  const PAGE_SIZE = 12;
  
  const {
    data: productsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', filters, search],
    queryFn: ({ pageParam = 1 }) => api.getProducts({
      is_active: true,
      search: search || undefined,
      category_id: filters.category ? parseInt(filters.category) : undefined,
      brand_id: filters.brand ? parseInt(filters.brand) : undefined,
      tags: filters.tag || undefined,  // Tag filter support
      page: pageParam,
      page_size: PAGE_SIZE,
    }),
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = Math.ceil(lastPage.total / PAGE_SIZE);
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  // Auto-detect if search matches a category or brand name
  useEffect(() => {
    if (!search || !categories || !brands) return;
    
    const searchLower = search.toLowerCase().trim();
    
    // Check if search matches a category name
    const matchedCategory = categories.find((c: any) => 
      c.name.toLowerCase() === searchLower || 
      c.name.toLowerCase().includes(searchLower)
    );
    
    // Check if search matches a brand name
    const matchedBrand = brands.find((b: any) => 
      b.name.toLowerCase() === searchLower ||
      b.name.toLowerCase().includes(searchLower)
    );
    
    // Auto-apply filter if exact match found
    if (matchedCategory && matchedCategory.name.toLowerCase() === searchLower) {
      setFilters(f => ({ ...f, category: matchedCategory.id.toString() }));
      setSearch('');
    } else if (matchedBrand && matchedBrand.name.toLowerCase() === searchLower) {
      setFilters(f => ({ ...f, brand: matchedBrand.id.toString() }));
      setSearch('');
    }
  }, [search, categories, brands]);

  // Flatten all pages into a single array
  const products = productsData?.pages?.flatMap(page => page.items) || [];
  const totalProducts = productsData?.pages?.[0]?.total || 0;

  // Sort products (client-side for now, ideally should be server-side)
  const sortedProducts = [...products].sort((a: any, b: any) => {
    switch (filters.sort) {
      case 'price_low':
        return Number(a.price) - Number(b.price);
      case 'price_high':
        return Number(b.price) - Number(a.price);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0; // Keep server order for newest
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Banner */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Products
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our collection of premium car gadgets and accessories
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-wide py-8">
        {/* Search and Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-12 h-12"
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-5 h-5 mr-2" />
            Filters
          </Button>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-3">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="h-12 px-4 bg-card border border-border rounded-lg"
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={filters.brand}
              onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              className="h-12 px-4 bg-card border border-border rounded-lg"
            >
              <option value="">All Brands</option>
              {brands?.map((brand: any) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>

            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="h-12 px-4 bg-card border border-border rounded-lg"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  "p-3 transition-colors",
                  view === 'grid' ? 'bg-primary text-white' : 'hover:bg-secondary'
                )}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  "p-3 transition-colors",
                  view === 'list' ? 'bg-primary text-white' : 'hover:bg-secondary'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden mb-6"
            >
              <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border">
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="h-12 px-4 bg-background border border-border rounded-lg"
                >
                  <option value="">All Categories</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="h-12 px-4 bg-background border border-border rounded-lg"
                >
                  <option value="">All Brands</option>
                  {brands?.map((brand: any) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>

                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  className="h-12 px-4 bg-background border border-border rounded-lg"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {sortedProducts.length} of {totalProducts} product{totalProducts !== 1 ? 's' : ''}
            {filters.tag && <span className="ml-2 text-primary">• Tag: #{filters.tag}</span>}
          </p>
          {(filters.category || filters.brand || filters.tag || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ category: '', brand: '', tag: '', sort: 'newest' });
                setSearch('');
              }}
            >
              Clear Filters <X className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Products Grid/List */}
        {isLoading ? (
          <div className={cn(
            "gap-6",
            view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col'
          )}>
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
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              {filters.tag 
                ? `No products found with tag "${filters.tag}". Try a different search.` 
                : 'Try adjusting your search or filters'}
            </p>
            <Button onClick={() => {
              setFilters({ category: '', brand: '', tag: '', sort: 'newest' });
              setSearch('');
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <motion.div
              layout
              className={cn(
                "gap-6",
                view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col'
              )}
            >
              {sortedProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} view={view} />
              ))}
            </motion.div>
            
            {/* Load More / Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading more products...
                </div>
              ) : hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  className="gap-2"
                >
                  Load More Products
                  <ChevronDown className="w-4 h-4" />
                </Button>
              ) : sortedProducts.length > PAGE_SIZE ? (
                <p className="text-muted-foreground text-sm">
                  You've seen all {totalProducts} products
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
