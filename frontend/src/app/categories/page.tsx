'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Package, FolderOpen } from 'lucide-react';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';

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

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['public-categories-tree'],
    queryFn: () => api.getCategoryTree(true),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Shop by Category
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse our product categories to find exactly what you need for your vehicle
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-card rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Categories Yet</h2>
            <p className="text-muted-foreground">Check back soon for product categories</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category: any, i: number) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="group relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-border hover:border-primary/50 transition-all">
                    {/* Background Image */}
                    {category.image_data ? (
                      <img
                        src={getImageSrc(category.image_data)}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FolderOpen className="w-24 h-24 text-primary/20" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-white/70 text-sm mb-3 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">
                          {category.product_count || 0} Products
                        </span>
                        <span className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                          Browse <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>

                    {/* Sub-categories */}
                    {category.children && category.children.length > 0 && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full">
                          {category.children.length} Sub-categories
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Sub-categories list */}
                {category.children && category.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.children.slice(0, 3).map((sub: any) => (
                      <Link
                        key={sub.id}
                        href={`/categories/${sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="px-3 py-1 bg-secondary rounded-full text-sm hover:bg-primary hover:text-white transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                    {category.children.length > 3 && (
                      <span className="px-3 py-1 text-sm text-muted-foreground">
                        +{category.children.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
