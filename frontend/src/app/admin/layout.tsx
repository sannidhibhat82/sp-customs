'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Layers,
  Tags,
  Warehouse,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  BarChart3,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/categories', icon: Layers, label: 'Categories' },
  { href: '/admin/brands', icon: Tags, label: 'Brands' },
  { href: '/admin/inventory', icon: Warehouse, label: 'Inventory' },
  { href: '/admin/scanner', icon: QrCode, label: 'Scanner' },
  { href: '/admin/homepage', icon: Home, label: 'Homepage' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isAuthenticated, pathname, router, isHydrated]);

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border flex items-center px-4">
        <button onClick={toggleSidebar} className="p-2 hover:bg-secondary rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-lg font-bold gradient-text">SP CUSTOMS</span>
        </div>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <>
            {/* Overlay for mobile */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <motion.aside
              initial={isMobile ? { x: -280 } : false}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-card border-r border-border flex flex-col",
                "lg:z-30"
              )}
            >
              {/* Logo */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <Link href="/admin" className="flex items-center gap-2 group">
                  <svg viewBox="0 0 1696 608" className="h-8 w-auto text-primary group-hover:text-primary/80 transition-colors">
                    <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1z"/>
                    <path fill="currentColor" d="m998 217c0 0 39.82 3.04 33 38-6.82 34.96-2 12-2 12 0 0-58.73 228.4 229 268 59.19 8.15 240.25-1.42 258-1 8.17 0.19 82-108 82-108l-327-2c0 0-97.87 0.94-113-87-0.61-3.54 17.96-49.76 18-52 1.1-60.99-19.63-105.66-56-139-36.37-33.34-121.64-41.04-131-42-9.36-0.96-320 1-320 1l-87 111z"/>
                    <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186z"/>
                    <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186zm619-281l277-4 83-112-358 1c0 0-64.61 5.61-95 26-8.18 5.49-1.51 6.99 4.87 10.26 13.68 7.03 49.33 59.46 49.13 93.74q-0.01 1.62 0.1 2.99c0.13 1.75 38.9-17.99 38.9-17.99z"/>
                  </svg>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </Link>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-secondary rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/admin' && pathname?.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={cn(
                        "sidebar-item",
                        isActive && "active"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4" />}
                    </Link>
                  );
                })}
              </nav>

              {/* User Section */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {user?.username?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "pt-16 lg:pt-0",
        sidebarOpen || !isMobile ? "lg:ml-[280px]" : ""
      )}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

