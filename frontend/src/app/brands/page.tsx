'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Tag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

export default function BrandsPage() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ['public-brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  // Group brands by first letter
  const groupedBrands = brands?.reduce((acc: any, brand: any) => {
    const letter = brand.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(brand);
    return acc;
  }, {}) || {};

  const sortedLetters = Object.keys(groupedBrands).sort();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Brands
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We partner with the most trusted brands in automotive accessories
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-wide py-12">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-40 bg-card rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : !brands || brands.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Brands Yet</h2>
            <p className="text-muted-foreground">Check back soon for brand partners</p>
          </div>
        ) : (
          <>
            {/* Featured Brands */}
            {brands.filter((b: any) => b.is_featured).length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Featured Brands</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {brands.filter((b: any) => b.is_featured).map((brand: any, i: number) => (
                    <motion.div
                      key={brand.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link href={`/brands/${brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="group relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-border hover:border-primary transition-all flex flex-col items-center justify-center p-6">
                          {brand.logo_data ? (
                            <img
                              src={getImageSrc(brand.logo_data)}
                              alt={brand.name}
                              className="h-16 w-auto object-contain group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-primary">
                              {brand.name}
                            </span>
                          )}
                          <p className="mt-4 text-center font-semibold group-hover:text-primary transition-colors">
                            {brand.name}
                          </p>
                          {brand.description && (
                            <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                              {brand.description}
                            </p>
                          )}
                          
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium flex items-center gap-2">
                              View Products <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* All Brands A-Z */}
            <div>
              <h2 className="text-2xl font-bold mb-6">All Brands</h2>
              
              {/* Letter Navigation */}
              <div className="flex flex-wrap gap-2 mb-8">
                {sortedLetters.map((letter) => (
                  <a
                    key={letter}
                    href={`#brand-${letter}`}
                    className="w-10 h-10 rounded-lg bg-secondary hover:bg-primary hover:text-white flex items-center justify-center font-semibold transition-colors"
                  >
                    {letter}
                  </a>
                ))}
              </div>

              {/* Brands Grid by Letter */}
              <div className="space-y-12">
                {sortedLetters.map((letter) => (
                  <div key={letter} id={`brand-${letter}`}>
                    <h3 className="text-xl font-bold mb-4 text-primary">{letter}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {groupedBrands[letter].map((brand: any, i: number) => (
                        <motion.div
                          key={brand.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          viewport={{ once: true }}
                        >
                          <Link href={`/brands/${brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            <div className="group p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all flex flex-col items-center justify-center min-h-[120px]">
                              {brand.logo_data ? (
                                <img
                                  src={getImageSrc(brand.logo_data)}
                                  alt={brand.name}
                                  className="h-10 w-auto object-contain group-hover:scale-110 transition-transform"
                                />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                  {brand.name}
                                </span>
                              )}
                              <p className="mt-2 text-sm font-medium text-center group-hover:text-primary transition-colors">
                                {brand.name}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
