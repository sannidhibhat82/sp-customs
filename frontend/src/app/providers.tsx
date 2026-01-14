'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useLayoutEffect } from 'react';
import { useUIStore } from '@/lib/store';

// Accent color definitions
const accentColors: Record<string, string> = {
  orange: '24 95% 53%',
  blue: '217 91% 60%',
  green: '142 71% 45%',
  purple: '271 91% 65%',
  red: '0 84% 60%',
};

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function ThemeInitializer() {
  const { theme, accentColor } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Ensure we only apply theme on client
  useIsomorphicLayoutEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    
    // Default to dark theme immediately on first render
    if (!root.classList.contains('dark') && !root.classList.contains('light')) {
      root.classList.add('dark');
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Apply theme
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.remove('dark', 'light');
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.remove('dark', 'light');
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  useIsomorphicLayoutEffect(() => {
    if (!mounted) return;
    
    // Apply accent color to primary, ring, and accent
    const hsl = accentColors[accentColor] || accentColors.orange;
    document.documentElement.style.setProperty('--primary', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    document.documentElement.style.setProperty('--accent', hsl);
  }, [accentColor, mounted]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      {children}
    </QueryClientProvider>
  );
}

