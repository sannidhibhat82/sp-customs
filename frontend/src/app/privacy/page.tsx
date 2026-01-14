'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '@/components/public';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Privacy <span className="text-primary">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: January 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="bg-card rounded-2xl border border-border p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-muted-foreground">
                At SP Customs, we are committed to protecting your privacy. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you visit our website 
                or make a purchase.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
                <div className="text-muted-foreground space-y-4">
                  <p><strong>Personal Information:</strong> When you make a purchase, we collect:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Name and contact details (email, phone number)</li>
                    <li>Shipping and billing address</li>
                    <li>Payment information (processed securely by payment partners)</li>
                    <li>Order history and preferences</li>
                  </ul>
                  <p><strong>Automatically Collected Information:</strong></p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Device and browser information</li>
                    <li>IP address and location data</li>
                    <li>Pages visited and time spent on site</li>
                    <li>Referring website information</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">2. How We Use Your Information</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Process and fulfill your orders</li>
                    <li>Communicate with you about orders, products, and services</li>
                    <li>Send promotional communications (with your consent)</li>
                    <li>Improve our website and customer service</li>
                    <li>Detect and prevent fraud</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">3. Information Sharing</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>We may share your information with:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Providers:</strong> Shipping partners, payment processors, analytics services</li>
                    <li><strong>Business Partners:</strong> For joint promotions or collaborations</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  </ul>
                  <p>We do not sell your personal information to third parties.</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">4. Data Security</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We implement appropriate security measures to protect your personal information 
                    from unauthorized access, alteration, disclosure, or destruction. This includes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>SSL encryption for all data transmission</li>
                    <li>Secure payment processing through trusted partners</li>
                    <li>Regular security audits and updates</li>
                    <li>Limited employee access to personal data</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">5. Cookies & Tracking</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We use cookies and similar technologies to enhance your browsing experience, 
                    remember your preferences, and analyze website traffic. You can control cookies 
                    through your browser settings.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">6. Your Rights</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Request data portability</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">7. Third-Party Links</h2>
                <div className="text-muted-foreground">
                  <p>
                    Our website may contain links to third-party websites. We are not responsible 
                    for the privacy practices of these external sites. We encourage you to review 
                    their privacy policies.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">8. Changes to This Policy</h2>
                <div className="text-muted-foreground">
                  <p>
                    We may update this Privacy Policy from time to time. We will notify you of 
                    any changes by posting the new policy on this page and updating the "Last updated" date.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">9. Contact Us</h2>
                <div className="text-muted-foreground">
                  <p>
                    If you have questions about this Privacy Policy or our privacy practices, 
                    please contact us at:
                  </p>
                  <ul className="list-none mt-4 space-y-2">
                    <li><strong>Email:</strong> privacy@spcustoms.com</li>
                    <li><strong>Phone:</strong> +91 98765 43210</li>
                    <li><strong>Address:</strong> Bangalore, Karnataka, India</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
