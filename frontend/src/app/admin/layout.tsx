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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
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
                <Link href="/admin" className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-xl font-bold text-white">SP</span>
                  </div>
                  <span className="text-lg font-bold">CUSTOMS</span>
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

