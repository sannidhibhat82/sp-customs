'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Truck,
  Star,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Play,
  Quote,
  Award,
  Users,
  Package,
  Clock,
  CheckCircle,
  Instagram,
  MessageCircle,
  Phone,
  Mail,
  Wrench,
  Car,
  Headphones,
  Percent,
  Send,
  Gauge,
  Settings,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { cn, getWhatsAppUrl, getPhoneUrl } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { toast } from '@/components/ui/use-toast';

// ============================================
// LOADING SCREEN COMPONENT - Modern & Trendy
// ============================================
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'logo' | 'loading' | 'complete'>('logo');

  useEffect(() => {
    // Phase 1: Show logo animation
    const logoTimer = setTimeout(() => setPhase('loading'), 800);
    
    // Phase 2: Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setPhase('complete');
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => {
      clearTimeout(logoTimer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Glowing Orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]"
        animate={{
          scale: [1.2, 1, 1.2],
          x: [-50, 50, -50],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with Reveal Animation - Same as Header */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="mb-8 relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/30 blur-3xl scale-150" />
          
          {/* Same SVG logo as header */}
          <motion.svg 
            viewBox="0 0 1696 608" 
            className="relative h-16 sm:h-24 w-auto text-primary"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1z"/>
            <path fill="currentColor" d="m998 217c0 0 39.82 3.04 33 38-6.82 34.96-2 12-2 12 0 0-58.73 228.4 229 268 59.19 8.15 240.25-1.42 258-1 8.17 0.19 82-108 82-108l-327-2c0 0-97.87 0.94-113-87-0.61-3.54 17.96-49.76 18-52 1.1-60.99-19.63-105.66-56-139-36.37-33.34-121.64-41.04-131-42-9.36-0.96-320 1-320 1l-87 111z"/>
            <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186z"/>
            <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186zm619-281l277-4 83-112-358 1c0 0-64.61 5.61-95 26-8.18 5.49-1.51 6.99 4.87 10.26 13.68 7.03 49.33 59.46 49.13 93.74q-0.01 1.62 0.1 2.99c0.13 1.75 38.9-17.99 38.9-17.99z"/>
          </motion.svg>
        </motion.div>

        {/* Loading Text with Typewriter Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <motion.h2 
            className="text-lg sm:text-xl font-medium text-muted-foreground mb-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {phase === 'loading' ? 'Loading Premium Experience' : phase === 'complete' ? 'Ready!' : 'SP Customs'}
          </motion.h2>
          <p className="text-sm text-muted-foreground/60">Premium Vehicle Gadgets</p>
        </motion.div>

        {/* Progress Bar with Glow Effect */}
        <motion.div 
          className="w-64 sm:w-80 h-1 bg-secondary rounded-full overflow-hidden relative"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <motion.div
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3 }}
          >
            {/* Glow effect */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full blur-md" />
          </motion.div>
        </motion.div>

        {/* Percentage */}
        <motion.p
          className="mt-4 text-sm font-mono text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {Math.min(Math.round(progress), 100)}%
        </motion.p>

        {/* Animated Icons */}
        <motion.div 
          className="flex items-center gap-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[Car, Gauge, Settings].map((Icon, i) => (
            <motion.div
              key={i}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
              animate={{
                y: [0, -5, 0],
                borderColor: ['hsl(var(--border))', 'hsl(var(--primary) / 0.5)', 'hsl(var(--border))'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom Scanline Effect */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{ opacity: [0, 1, 0], y: [100, 0, -100] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}

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
  } else if (imageData.startsWith('R0lGO')) {
    return `data:image/gif;base64,${imageData}`;
  } else if (imageData.startsWith('UklGR')) {
    return `data:image/webp;base64,${imageData}`;
  }
  return `data:image/jpeg;base64,${imageData}`;
}

// Gradient color mapping for banners
const gradientColorMap: Record<string, string> = {
  'orange-600': '#ea580c',
  'red-600': '#dc2626',
  'blue-600': '#2563eb',
  'purple-600': '#9333ea',
  'green-600': '#16a34a',
  'teal-600': '#0d9488',
  'rose-500': '#f43f5e',
  'pink-600': '#db2777',
  'violet-500': '#8b5cf6',
  'emerald-500': '#10b981',
  'amber-500': '#f59e0b',
  'cyan-500': '#06b6d4',
};

function getBannerGradient(from: string, to: string) {
  const fromColor = gradientColorMap[from] || '#ea580c';
  const toColor = gradientColorMap[to] || '#dc2626';
  return `linear-gradient(135deg, ${fromColor}, ${toColor})`;
}

// Animated Counter Component
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 2000;
          const increment = target / (duration / 16);
          
          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold text-primary">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
}

// Sports Car Image Component
function SportsCar({ className }: { className?: string }) {
  const accentColor = useUIStore((state) => state.accentColor);
  
  const carImages: Record<string, string> = {
    orange: '/car-orange.png',
    blue: '/car-blue.png',
    green: '/car-green.png',
    purple: '/car-purple.png',
    red: '/car-red.png',
  };
  
  const carImage = carImages[accentColor] || '/car-orange.png';
  
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[70%] h-[50%] bg-primary/30 blur-[100px] rounded-full" />
      </div>
      <img 
        src={carImage}
        alt="Premium Sports Car" 
        className="w-full h-auto relative z-10"
        style={{ filter: 'drop-shadow(0 20px 50px hsl(var(--primary) / 0.4))' }}
      />
    </div>
  );
}

// Enhanced Product Card Component
function ProductCard({ product, index }: { product: any; index: number }) {
  const imageData = product.primary_image || product.images?.[0]?.image_data;
  
  return (
    <Link href={`/products/${product.slug || product.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        viewport={{ once: true }}
        whileHover={{ y: -8 }}
        className="group relative bg-card rounded-2xl border border-border overflow-hidden h-full transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
        
        <div className="aspect-square bg-gradient-to-br from-secondary/50 to-secondary/20 relative overflow-hidden">
          {imageData ? (
            <img
              src={getImageSrc(imageData)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="w-16 h-16 opacity-20" />
            </div>
          )}
          
          {product.is_new && (
            <span className="absolute top-3 left-3 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
              NEW
            </span>
          )}
          
          {/* Quick view button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div 
              initial={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              className="w-14 h-14 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-xl"
            >
              <ArrowRight className="w-6 h-6 text-primary" />
            </motion.div>
          </div>
        </div>
        
        <div className="p-5 relative z-20">
          <p className="text-xs text-primary font-semibold mb-2 truncate uppercase tracking-wider">
            {product.brand?.name || product.category?.name || 'SP Customs'}
          </p>
          <h3 className="font-semibold text-base mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">₹{Number(product.price || 0).toLocaleString('en-IN')}</span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                </span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-bold rounded">
                  {Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)}% OFF
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Enhanced Section Title Component
function SectionTitle({ tag, title, subtitle, center = false }: { tag?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : ''}>
      {tag && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 text-primary font-semibold text-sm tracking-[0.2em] uppercase mb-3"
        >
          <span className="w-8 h-px bg-primary" />
          {tag}
          <span className="w-8 h-px bg-primary" />
        </motion.span>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl lg:text-5xl font-bold"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-4 max-w-2xl text-lg"
          style={center ? { marginLeft: 'auto', marginRight: 'auto' } : {}}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer({ endTime }: { endTime: string | null }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    if (!endTime) return;
    
    const updateTimer = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);
      
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex gap-3">
      {Object.entries(timeLeft).map(([label, value]) => (
        <div key={label} className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-card to-secondary border border-border rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-primary">
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-2 capitalize block">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [currentBanner, setCurrentBanner] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Fetch homepage content
  const { data: homepageContent, isLoading: homepageLoading } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: () => api.getHomepageContent(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api.getProducts({ is_active: true, page_size: 8 }),
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  // Fetch brands
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['public-brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  const banners = homepageContent?.banners || [];
  const testimonials = homepageContent?.testimonials || [];
  const reels = homepageContent?.reels || [];
  const dealOfTheDay = homepageContent?.deal_of_the_day;
  const products = productsData?.items || [];

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    setNewsletterLoading(true);
    try {
      await api.subscribeNewsletter({ email: newsletterEmail });
      toast({ title: 'Subscribed successfully!', variant: 'success' });
      setNewsletterEmail('');
    } catch (error: any) {
      toast({ 
        title: error.response?.data?.detail || 'Failed to subscribe', 
        variant: 'destructive' 
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <>
      {/* Loading Screen */}
      <AnimatePresence>
        {showLoading && (
          <LoadingScreen onComplete={() => setShowLoading(false)} />
        )}
      </AnimatePresence>

      <div className={cn("min-h-screen bg-background", showLoading && "overflow-hidden")}>
        <Header />

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-[calc(100vh-64px)] flex items-center pt-4 sm:pt-8 lg:pt-12 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <div className="absolute top-20 -left-32 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
          </div>
          
          <motion.div style={{ y, opacity }} className="relative container-wide py-6 sm:py-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: showLoading ? 0 : 0.3 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" />
                    Premium Car Gadgets
                  </span>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
                    Transform Your
                    <span className="block text-primary">
                      Driving Experience
                    </span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                    Discover premium car gadgets and accessories with expert installation and warranty. Upgrade your ride today.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <Link href="/products">
                      <Button size="lg" className="gap-2 shadow-lg shadow-primary/30 text-base h-14 px-8">
                        Explore Products <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                    <Link href={getWhatsAppUrl()} target="_blank">
                      <Button size="lg" variant="outline" className="gap-2 text-base h-14 px-8 border-2">
                        <MessageCircle className="w-5 h-5" /> Get Quote
                      </Button>
                    </Link>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-8 mt-12 pt-8 border-t border-border/50">
                    <div>
                      <div className="text-3xl font-bold text-primary">500+</div>
                      <div className="text-sm text-muted-foreground">Products</div>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div>
                      <div className="text-3xl font-bold text-primary">10K+</div>
                      <div className="text-sm text-muted-foreground">Customers</div>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
                      <span className="text-3xl font-bold">4.9</span>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Car Image */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: showLoading ? 0 : 0.5 }}
                className="hidden lg:block"
              >
                <SportsCar className="w-full max-w-[650px]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
              <motion.div 
                className="w-1 h-2 bg-primary rounded-full"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </section>

        {/* Promo Banners */}
        {banners.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className="container-wide">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentBanner}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 md:p-12"
                    style={{ 
                      background: getBannerGradient(
                        banners[currentBanner]?.gradient_from || 'orange-600',
                        banners[currentBanner]?.gradient_to || 'red-600'
                      )
                    }}
                  >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                          {banners[currentBanner]?.title}
                        </span>
                        <h3 className="text-3xl md:text-4xl font-bold text-white mt-2">
                          {banners[currentBanner]?.subtitle}
                        </h3>
                        <p className="text-white/80 mt-2 text-lg">{banners[currentBanner]?.description}</p>
                      </div>
                      <Link href={banners[currentBanner]?.cta_link || '/products'}>
                        <Button size="lg" variant="secondary" className="whitespace-nowrap text-base h-14 px-8 shadow-lg">
                          {banners[currentBanner]?.cta_text || 'Shop Now'} <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {banners.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setCurrentBanner(i)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          currentBanner === i ? "w-8 bg-white" : "bg-white/50 hover:bg-white/70"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-10 sm:py-16">
          <div className="container-wide">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Shield, title: 'Genuine Products', desc: 'Authorized dealer' },
                { icon: Truck, title: 'Fast Delivery', desc: 'Pan India shipping' },
                { icon: Wrench, title: 'Expert Install', desc: 'Professional fitting' },
                { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
              ].map((feature, i) => (
                <FeatureCard key={feature.title} {...feature} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <section className="py-12 sm:py-20">
            <div className="container-wide">
              <div className="flex items-end justify-between mb-12">
                <SectionTitle 
                  tag="Categories" 
                  title="Shop by Category" 
                  subtitle="Find exactly what you need for your vehicle"
                />
                <Link href="/categories">
                  <Button variant="ghost" size="lg" className="gap-2 hidden sm:flex">
                    View All <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {categories.slice(0, 4).map((category: any, i: number) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Link href={`/categories/${category.slug || category.id}`}>
                      <div className="group relative h-52 md:h-64 rounded-2xl overflow-hidden cursor-pointer">
                        {category.image_data ? (
                          <>
                            {/* With Image */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
                            <img
                              src={getImageSrc(category.image_data)}
                              alt={category.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            {/* Content at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                                {category.name}
                              </h3>
                              <p className="text-white/70 text-sm flex items-center gap-2">
                                {category.product_count || 0} Products
                                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Without Image - Colored Background from admin or fallback */}
                            <div 
                              className="absolute inset-0 transition-all duration-500 group-hover:scale-105"
                              style={{ 
                                background: category.background_color 
                                  ? category.background_color 
                                  : `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)`
                              }}
                            />
                            {/* Dark overlay at bottom */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            {/* Large centered faded category name */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl md:text-2xl font-bold text-white/30 text-center px-4">
                                {category.name}
                              </span>
                            </div>
                            {/* Content at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                                {category.name}
                              </h3>
                              <p className="text-white/70 text-sm flex items-center gap-2">
                                {category.product_count || 0} Products
                                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                              </p>
                            </div>
                          </>
                        )}
                        
                        {/* Border glow on hover */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/30 transition-all duration-300" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Products */}
        {products.length > 0 && (
          <section className="py-12 sm:py-20 bg-gradient-to-b from-secondary/30 to-background relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
            
            <div className="container-wide relative">
              <div className="flex items-end justify-between mb-12">
                <SectionTitle 
                  tag="Bestsellers" 
                  title="Featured Products" 
                  subtitle="Our most popular products loved by customers"
                />
                <Link href="/products">
                  <Button variant="ghost" size="lg" className="gap-2 hidden sm:flex">
                    View All <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {products.slice(0, 4).map((product: any, i: number) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>

              {/* Mobile View All Button */}
              <div className="mt-8 text-center sm:hidden">
                <Link href="/products">
                  <Button variant="outline" size="lg" className="gap-2">
                    View All Products <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Deal of the Day */}
        {dealOfTheDay && (
          <section className="py-12 sm:py-20">
            <div className="container-wide">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-3xl overflow-hidden"
              >
                {/* Background - uses accent/primary colors */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
                
                <div className="relative border border-primary/30 rounded-3xl p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-bold mb-6">
                        <Zap className="w-4 h-4" /> Deal of the Day
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold mb-3">{dealOfTheDay.title}</h2>
                      <p className="text-muted-foreground text-lg mb-6">{dealOfTheDay.description}</p>
                      
                      {dealOfTheDay.end_time && (
                        <div className="mb-8">
                          <p className="text-sm text-muted-foreground mb-3 font-medium">Ends in:</p>
                          <CountdownTimer endTime={dealOfTheDay.end_time} />
                        </div>
                      )}

                      <div className="flex items-center gap-4 mb-8">
                        <span className="text-4xl font-bold text-primary">
                          ₹{dealOfTheDay.deal_price?.toLocaleString()}
                        </span>
                        {dealOfTheDay.original_price && (
                          <span className="text-xl text-muted-foreground line-through">
                            ₹{dealOfTheDay.original_price.toLocaleString()}
                          </span>
                        )}
                        {dealOfTheDay.discount_percentage > 0 && (
                          <span className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-full shadow-lg shadow-primary/30">
                            {dealOfTheDay.discount_percentage}% OFF
                          </span>
                        )}
                      </div>

                      <Link href={`/products/${dealOfTheDay.product?.slug || dealOfTheDay.product?.id || ''}`}>
                        <Button size="lg" className="gap-2 shadow-lg shadow-primary/30 h-14 px-8">
                          View Deal <ArrowRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>

                    {/* Product Image - Always show */}
                    <div className="flex justify-center">
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {/* Glow effect behind image */}
                        <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-2xl scale-90" />
                        {dealOfTheDay.product?.primary_image ? (
                          <img
                            src={getImageSrc(dealOfTheDay.product.primary_image)}
                            alt={dealOfTheDay.product?.name}
                            className="relative max-w-sm w-full h-auto rounded-2xl shadow-2xl border border-primary/20"
                          />
                        ) : (
                          <div className="relative w-72 h-72 bg-card rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center justify-center">
                            <Package className="w-20 h-20 text-primary/40 mb-4" />
                            <span className="text-lg font-medium text-muted-foreground">Product Image</span>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="py-12 sm:py-20 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          
          <div className="container-wide relative">
            <div className="text-center mb-12">
              <SectionTitle 
                tag="Our Impact" 
                title="Trusted by Thousands" 
                subtitle="Numbers that speak for our quality and service"
                center
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { value: 10000, suffix: '+', label: 'Happy Customers', icon: Users },
                { value: 500, suffix: '+', label: 'Products', icon: Package },
                { value: 50, suffix: '+', label: 'Premium Brands', icon: Award },
                { value: 5, suffix: ' Yrs', label: 'Experience', icon: Clock },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-8 h-8 text-primary" />
                  </div>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  <p className="text-muted-foreground mt-2 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Instagram Reels */}
        {reels.length > 0 && (
          <section className="py-12 sm:py-20 bg-gradient-to-b from-background to-secondary/20">
            <div className="container-wide">
              <div className="text-center mb-12">
                <SectionTitle 
                  tag="@sp_customs_" 
                  title="Watch Our Work" 
                  subtitle="Follow us for latest installations and car customization videos"
                  center
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {reels.map((reel: any, i: number) => (
                  <motion.a
                    key={reel.id}
                    href={reel.instagram_url || 'https://instagram.com/sp_customs_'}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03 }}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg"
                  >
                    {/* Thumbnail Image */}
                    {reel.thumbnail_data ? (
                      <img
                        src={getImageSrc(reel.thumbnail_data)}
                        alt={reel.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500" />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    
                    {/* Instagram icon badge */}
                    <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <Instagram className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div 
                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </motion.div>
                    </div>
                    
                    {/* Title & Views */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-white font-semibold text-sm md:text-base line-clamp-2 mb-1">{reel.title}</h4>
                      {reel.views_count && (
                        <p className="text-white/70 text-xs flex items-center gap-1">
                          <Play className="w-3 h-3 fill-white/70" /> {reel.views_count} views
                        </p>
                      )}
                    </div>
                    
                    {/* Hover border */}
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-primary/50 transition-all pointer-events-none" />
                  </motion.a>
                ))}
              </div>

              <div className="text-center mt-10">
                <Link href="https://instagram.com/sp_customs_" target="_blank">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="gap-2 border-2 hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 hover:text-white hover:border-transparent transition-all"
                  >
                    <Instagram className="w-5 h-5" /> Follow on Instagram
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section className="py-12 sm:py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            
            <div className="container-wide relative">
              <div className="text-center mb-12">
                <SectionTitle tag="Reviews" title="What Customers Say" center />
              </div>

              <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center relative"
                  >
                    {/* Quote icon */}
                    <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Quote className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex items-center justify-center gap-1 mb-6">
                      {[...Array(5)].map((_, j) => (
                        <Star 
                          key={j} 
                          className={cn(
                            "w-6 h-6", 
                            j < testimonials[currentTestimonial]?.rating 
                              ? "fill-yellow-500 text-yellow-500" 
                              : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>
                    
                    <p className="text-xl md:text-2xl text-foreground/90 mb-8 leading-relaxed">
                      "{testimonials[currentTestimonial]?.review_text}"
                    </p>
                    
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {testimonials[currentTestimonial]?.customer_name[0]}
                        </span>
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-lg">{testimonials[currentTestimonial]?.customer_name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonials[currentTestimonial]?.customer_role}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation dots */}
                {testimonials.length > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {testimonials.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setCurrentTestimonial(i)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          currentTestimonial === i ? "w-8 bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Brands */}
        {brands && brands.length > 0 && (
          <section className="py-12 sm:py-20 border-y border-border/50">
            <div className="container-wide">
              <p className="text-center text-base text-muted-foreground font-medium mb-12 uppercase tracking-wider">
                Trusted by Leading Brands
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-8 md:gap-12 items-center justify-items-center">
                {brands.slice(0, 6).map((brand: any, i: number) => (
                  <motion.div
                    key={brand.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="w-full flex justify-center"
                  >
                    <Link 
                      href={`/brands/${brand.slug || brand.id}`} 
                      className="block hover:scale-110 transition-transform duration-300"
                    >
                      {brand.logo_data ? (
                        <img 
                          src={getImageSrc(brand.logo_data)} 
                          alt={brand.name} 
                          className="h-16 md:h-20 w-auto max-w-[140px] md:max-w-[180px] object-contain" 
                        />
                      ) : (
                        <div className="h-24 md:h-28 px-8 flex items-center justify-center bg-card border border-border rounded-xl min-w-[120px]">
                          <span className="text-2xl md:text-3xl font-bold text-foreground">{brand.name}</span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter */}
        <section className="py-12 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
              
              <div className="relative border border-primary/20 rounded-3xl p-8 md:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Stay Updated</h2>
                <p className="text-muted-foreground mb-8 text-lg">Get exclusive offers and product updates</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 h-14 text-base bg-card"
                    required
                  />
                  <Button type="submit" disabled={newsletterLoading} className="h-14 px-8">
                    {newsletterLoading ? '...' : <><Send className="w-5 h-5 mr-2" /> Subscribe</>}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Upgrade Your Ride?
              </h2>
              <p className="text-white/80 mb-10 max-w-2xl mx-auto text-lg">
                Contact us for personalized recommendations and exclusive deals on premium car gadgets
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={getWhatsAppUrl("Hi! I want to upgrade my car.")} target="_blank">
                  <Button size="lg" variant="secondary" className="gap-2 h-14 px-8 text-base shadow-xl">
                    <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
                  </Button>
                </Link>
                <Link href={getPhoneUrl()}>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="gap-2 h-14 px-8 text-base bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Phone className="w-5 h-5" /> Call Now
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />

        {/* Floating WhatsApp */}
        <motion.a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </motion.a>

        {/* Scroll to Top */}
        <ScrollToTop />
      </div>
    </>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-secondary transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
