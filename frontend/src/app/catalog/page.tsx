'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  ChevronRight,
  ChevronDown,
  Package,
  SlidersHorizontal,
  Grid,
  List,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc, generateWhatsAppLink, cn, getWhatsAppUrl } from '@/lib/utils';

function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || 'all');
  const [brandId, setBrandId] = useState(searchParams.get('brand') || 'all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['public-brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  // Fetch products - show all active products (including out of stock)
  const { data: products, isLoading } = useQuery({
    queryKey: ['public-products', page, search, categoryId, brandId, sortBy, sortOrder],
    queryFn: () =>
      api.getProducts({
        page,
        page_size: 12,
        search: search || undefined,
        category_id: categoryId !== 'all' ? Number(categoryId) : undefined,
        brand_id: brandId !== 'all' ? Number(brandId) : undefined,
        is_active: true,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId !== 'all') params.set('category', categoryId);
    if (brandId !== 'all') params.set('brand', brandId);
    
    const newUrl = params.toString() ? `/catalog?${params.toString()}` : '/catalog';
    window.history.replaceState({}, '', newUrl);
  }, [search, categoryId, brandId]);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('all');
    setBrandId('all');
    setPage(1);
  };

  const hasActiveFilters = search || categoryId !== 'all' || brandId !== 'all';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">SP</span>
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">CUSTOMS</span>
            </Link>
            
            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Link href={getWhatsAppUrl()} target="_blank">
                <Button>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Contact Us</span>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Search - Mobile */}
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { setCategoryId('all'); setPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors",
                      categoryId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    All Categories
                  </button>
                  {categories?.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(String(cat.id)); setPage(1); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between",
                        categoryId === String(cat.id) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                      )}
                    >
                      <span>{cat.name}</span>
                      {cat.product_count > 0 && (
                        <span className="text-xs text-muted-foreground">{cat.product_count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <h3 className="font-semibold mb-3">Brands</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setBrandId('all'); setPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors",
                      brandId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    All Brands
                  </button>
                  {brands?.map((brand: any) => (
                    <button
                      key={brand.id}
                      onClick={() => { setBrandId(String(brand.id)); setPage(1); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-colors",
                        brandId === String(brand.id) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                      )}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {categoryId !== 'all' 
                    ? categories?.find((c: any) => c.id === Number(categoryId))?.name || 'Products'
                    : 'All Products'
                  }
                </h1>
                <p className="text-muted-foreground">
                  {products?.total || 0} products found
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
                  const [by, order] = v.split('-');
                  setSortBy(by);
                  setSortOrder(order);
                  setPage(1);
                }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at-desc">Newest First</SelectItem>
                    <SelectItem value="created_at-asc">Oldest First</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex border border-border rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded",
                      viewMode === 'grid' ? "bg-secondary" : "hover:bg-secondary/50"
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded",
                      viewMode === 'list' ? "bg-secondary" : "hover:bg-secondary/50"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
                    Search: {search}
                    <button onClick={() => setSearch('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {categoryId !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
                    {categories?.find((c: any) => c.id === Number(categoryId))?.name}
                    <button onClick={() => setCategoryId('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {brandId !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
                    {brands?.find((b: any) => b.id === Number(brandId))?.name}
                    <button onClick={() => setBrandId('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Products Grid */}
            {isLoading ? (
              <div className={cn(
                "gap-6",
                viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"
              )}>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-secondary rounded-lg mb-4" />
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products?.items?.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                "gap-6",
                viewMode === 'grid' ? "grid sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"
              )}>
                {products?.items?.map((product: any, index: number) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/catalog/${product.slug}`}>
                      <Card className={cn(
                        "group overflow-hidden hover:border-primary/50 transition-all cursor-pointer",
                        viewMode === 'list' && "flex"
                      )}>
                        <div className={cn(
                          "relative bg-secondary",
                          viewMode === 'grid' ? "aspect-square" : "w-32 h-32 shrink-0"
                        )}>
                          {product.primary_image ? (
                            <img
                              src={getImageSrc(product.primary_image)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-muted-foreground opacity-50" />
                            </div>
                          )}
                          {product.is_new && (
                            <span className="absolute top-2 left-2 badge bg-green-500/80 text-white">
                              New
                            </span>
                          )}
                          {product.is_featured && (
                            <span className="absolute top-2 right-2 badge bg-primary/80 text-white">
                              Featured
                            </span>
                          )}
                          {!product.is_in_stock && (
                            <span className="absolute bottom-2 left-2 badge bg-red-500/80 text-white">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <CardContent className={cn(
                          "p-4",
                          viewMode === 'list' && "flex-1 flex flex-col justify-center"
                        )}>
                          {product.brand && (
                            <p className="text-xs text-primary font-medium mb-1">
                              {product.brand.name}
                            </p>
                          )}
                          <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          {product.short_description && viewMode === 'list' && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {product.short_description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            {product.price ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">
                                  {formatCurrency(product.price)}
                                </span>
                                {product.compare_at_price && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    {formatCurrency(product.compare_at_price)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Contact for price</span>
                            )}
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {products && products.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {products.total_pages}
                </span>
                <Button
                  variant="outline"
                  disabled={!products.has_next}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-card p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => { setCategoryId('all'); setPage(1); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors",
                    categoryId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                  )}
                >
                  All Categories
                </button>
                {categories?.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryId(String(cat.id)); setPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors",
                      categoryId === String(cat.id) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Brands</h3>
              <div className="space-y-1">
                <button
                  onClick={() => { setBrandId('all'); setPage(1); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors",
                    brandId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                  )}
                >
                  All Brands
                </button>
                {brands?.map((brand: any) => (
                  <button
                    key={brand.id}
                    onClick={() => { setBrandId(String(brand.id)); setPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors",
                      brandId === String(brand.id) ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear
                </Button>
              )}
              <Button onClick={() => setShowFilters(false)} className="flex-1">
                Apply
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CatalogPageContent />
    </Suspense>
  );
}