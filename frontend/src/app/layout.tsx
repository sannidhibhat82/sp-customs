import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'SP Customs - Premium Vehicle Gadgets',
  description: 'Dynamic Vehicle Gadgets Inventory & Catalog Platform by SP Customs',
  keywords: ['vehicle gadgets', 'car accessories', 'automotive', 'sp customs'],
  authors: [{ name: 'SP Customs' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a', // Dark theme color
};

// Script to set dark theme immediately to prevent flash
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('sp-customs-ui');
      if (stored) {
        var parsed = JSON.parse(stored);
        var theme = parsed.state && parsed.state.theme;
        if (theme === 'light') {
          document.documentElement.classList.add('light');
        } else if (theme === 'system') {
          var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.add(isDark ? 'dark' : 'light');
        } else {
          document.documentElement.classList.add('dark');
        }
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

