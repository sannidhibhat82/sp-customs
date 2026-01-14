'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Sun,
  Moon,
  Search,
  MessageCircle,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePublicThemeStore, useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const accentColors = [
  { name: 'orange', color: '#f97316', label: 'Orange' },
  { name: 'blue', color: '#3b82f6', label: 'Blue' },
  { name: 'green', color: '#22c55e', label: 'Green' },
  { name: 'purple', color: '#a855f7', label: 'Purple' },
  { name: 'red', color: '#ef4444', label: 'Red' },
] as const;

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = usePublicThemeStore();
  const { accentColor, setAccentColor } = useUIStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccentPicker, setShowAccentPicker] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
      root.classList.toggle('light', !systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement;
    const colorMap: Record<string, string> = {
      orange: '24.6 95% 53.1%',
      blue: '217.2 91.2% 59.8%',
      green: '142.1 76.2% 36.3%',
      purple: '270.7 91% 65.1%',
      red: '0 84.2% 60.2%',
    };
    root.style.setProperty('--primary', colorMap[accentColor] || colorMap.orange);
  }, [accentColor]);

  // Handle ESC key to close search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-lg'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <svg viewBox="0 0 1696 608" className="h-10 sm:h-12 w-auto text-primary group-hover:text-primary/80 transition-colors">
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1z"/>
                <path fill="currentColor" d="m998 217c0 0 39.82 3.04 33 38-6.82 34.96-2 12-2 12 0 0-58.73 228.4 229 268 59.19 8.15 240.25-1.42 258-1 8.17 0.19 82-108 82-108l-327-2c0 0-97.87 0.94-113-87-0.61-3.54 17.96-49.76 18-52 1.1-60.99-19.63-105.66-56-139-36.37-33.34-121.64-41.04-131-42-9.36-0.96-320 1-320 1l-87 111z"/>
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186z"/>
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186zm619-281l277-4 83-112-358 1c0 0-64.61 5.61-95 26-8.18 5.49-1.51 6.99 4.87 10.26 13.68 7.03 49.33 59.46 49.13 93.74q-0.01 1.62 0.1 2.99c0.13 1.75 38.9-17.99 38.9-17.99z"/>
              </svg>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium rounded-lg transition-all',
                    pathname === link.href
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  {link.label}
                  {pathname === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden sm:flex"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Accent Color Picker */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAccentPicker(!showAccentPicker)}
                  className="relative"
                >
                  <Palette className="w-5 h-5" />
                  <span 
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-background"
                    style={{ backgroundColor: accentColors.find(c => c.name === accentColor)?.color }}
                  />
                </Button>
                
                {/* Accent Picker Dropdown */}
                <AnimatePresence>
                  {showAccentPicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowAccentPicker(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 p-3 bg-card rounded-xl border border-border shadow-xl z-50 min-w-[180px]"
                      >
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Accent Color</p>
                        <div className="flex gap-2">
                          {accentColors.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => {
                                setAccentColor(color.name as any);
                                setShowAccentPicker(false);
                              }}
                              className={cn(
                                "w-8 h-8 rounded-full transition-all hover:scale-110",
                                accentColor === color.name && "ring-2 ring-offset-2 ring-offset-background"
                              )}
                              style={{ 
                                backgroundColor: color.color,
                              }}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="relative"
              >
                <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              {/* Enquire CTA - Uses theme accent color */}
              <Link
                href="https://wa.me/919876543210?text=Hi! I'm interested in your car gadgets."
                target="_blank"
                className="hidden sm:block"
              >
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Enquire Now
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>

        </div>
      </header>

      {/* Search Overlay - Full screen with blur */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-xl"
            onClick={() => setShowSearch(false)}
          >
            {/* Search Modal */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <form onSubmit={handleSearch} className="p-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search for products, brands, categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                        className="pl-12 h-14 text-base bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="h-14 px-6">
                      Search
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-14 w-14 shrink-0"
                      onClick={() => setShowSearch(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </form>
                
                {/* Quick Links */}
                <div className="px-4 pb-4 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {['Car Audio', 'Phone Mount', 'Dash Camera', 'LED Lights'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          router.push(`/products?search=${encodeURIComponent(term)}`);
                          setShowSearch(false);
                        }}
                        className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Press ESC hint */}
              <p className="text-center text-xs text-muted-foreground mt-4">
                Press <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">ESC</kbd> to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-background border-l border-border z-50 lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-lg font-bold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <nav className="p-4 space-y-2">
                {/* Mobile Search */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                      setIsMobileMenuOpen(false);
                      setSearchQuery('');
                    }
                  }}
                  className="pb-4 border-b border-border"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </form>

                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'block px-4 py-3 rounded-lg font-medium transition-colors',
                      pathname === link.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Mobile Theme & Accent Settings */}
                <div className="pt-4 border-t border-border mt-4 space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-sm font-medium">Theme</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTheme}
                      className="gap-2"
                    >
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </Button>
                  </div>
                  
                  <div className="px-4">
                    <span className="text-sm font-medium block mb-2">Accent Color</span>
                    <div className="flex gap-2">
                      {accentColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setAccentColor(color.name as any)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all hover:scale-110",
                            accentColor === color.name && "ring-2 ring-offset-2 ring-offset-background"
                          )}
                          style={{ 
                            backgroundColor: color.color,
                          }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <Link
                    href="https://wa.me/919876543210?text=Hi! I'm interested in your car gadgets."
                    target="_blank"
                    className="block px-4"
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Enquire Now
                    </Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
