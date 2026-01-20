'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PHONE_DISPLAY, getPhoneUrl } from '@/lib/utils';

const footerLinks = {
  products: [
    { label: 'All Products', href: '/products' },
    { label: 'Categories', href: '/categories' },
    { label: 'Brands', href: '/brands' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Our Brands', href: '/brands' },
    { label: 'Installation', href: '/services' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Warranty', href: '/warranty' },
    { label: 'Shipping', href: '/shipping' },
    { label: 'Returns', href: '/returns' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-background to-background/95 border-t border-border">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container-wide">
        {/* Newsletter Section */}
        <div className="py-12 border-b border-border">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
              <p className="text-muted-foreground">
                Get notified about new products and exclusive offers.
              </p>
            </div>
            <div className="flex w-full max-w-md gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button>
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-6 group">
              <svg viewBox="0 0 1696 608" className="h-12 sm:h-14 w-auto text-foreground group-hover:text-foreground/80 transition-colors">
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1z"/>
                <path fill="currentColor" d="m998 217c0 0 39.82 3.04 33 38-6.82 34.96-2 12-2 12 0 0-58.73 228.4 229 268 59.19 8.15 240.25-1.42 258-1 8.17 0.19 82-108 82-108l-327-2c0 0-97.87 0.94-113-87-0.61-3.54 17.96-49.76 18-52 1.1-60.99-19.63-105.66-56-139-36.37-33.34-121.64-41.04-131-42-9.36-0.96-320 1-320 1l-87 111z"/>
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186z"/>
                <path fill="currentColor" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186zm619-281l277-4 83-112-358 1c0 0-64.61 5.61-95 26-8.18 5.49-1.51 6.99 4.87 10.26 13.68 7.03 49.33 59.46 49.13 93.74q-0.01 1.62 0.1 2.99c0.13 1.75 38.9-17.99 38.9-17.99z"/>
              </svg>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Your one-stop destination for premium vehicle gadgets and accessories. 
              Transform your ride with quality products and expert installation.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <a href={getPhoneUrl()} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                {PHONE_DISPLAY}
              </a>
              <a href="mailto:contact@spcustoms.com" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4" />
                contact@spcustoms.com
              </a>
              <a 
                href="https://maps.google.com/?q=377/6,+Kottara,+Mangaluru,+Karnataka+575006" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>377/6, Kottara, Mangaluru,<br />Karnataka 575006</span>
              </a>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Mon - Sat: 10:00 AM - 8:00 PM
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://instagram.com/spcustoms"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/spcustoms"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com/@spcustoms"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Products</h4>
            <ul className="space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SP Customs. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/admin/login" className="hover:text-foreground transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
