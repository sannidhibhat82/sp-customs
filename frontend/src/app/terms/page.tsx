'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '@/components/public';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <FileText className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terms of <span className="text-primary">Service</span>
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
              <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using SP Customs website and services, you agree to be bound by these 
                Terms of Service. If you disagree with any part of these terms, you may not access our services.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">1. Use of Our Services</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>By using our services, you agree to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Provide accurate and complete information when placing orders</li>
                    <li>Use our services only for lawful purposes</li>
                    <li>Not attempt to interfere with the proper functioning of our website</li>
                    <li>Not use automated systems to access our services without permission</li>
                    <li>Be at least 18 years old or have parental consent</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">2. Products & Pricing</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>All prices are listed in Indian Rupees (INR) and include applicable taxes</li>
                    <li>We reserve the right to change prices without prior notice</li>
                    <li>Product images are for illustration purposes; actual products may vary slightly</li>
                    <li>We make every effort to ensure accuracy, but errors in pricing or product information may occur</li>
                    <li>We reserve the right to cancel orders affected by pricing errors</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">3. Orders & Payment</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Placing an order constitutes an offer to purchase</li>
                    <li>We reserve the right to accept or decline any order</li>
                    <li>Order confirmation does not guarantee availability</li>
                    <li>Payment must be received in full before shipping</li>
                    <li>We use secure third-party payment processors</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">4. Shipping & Delivery</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Delivery times are estimates and not guaranteed</li>
                    <li>Risk of loss passes to you upon delivery</li>
                    <li>Shipping charges are non-refundable</li>
                    <li>We are not responsible for delays caused by shipping carriers</li>
                    <li>Please review our <Link href="/shipping" className="text-primary hover:underline">Shipping Policy</Link> for details</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">5. Returns & Refunds</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Returns accepted within 7 days of delivery for eligible products</li>
                    <li>Products must be unused and in original packaging</li>
                    <li>Some products are non-returnable (see <Link href="/returns" className="text-primary hover:underline">Returns Policy</Link>)</li>
                    <li>Refunds will be processed to original payment method</li>
                    <li>We reserve the right to refuse returns that don't meet our criteria</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">6. Warranty</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Products carry manufacturer warranty as specified</li>
                    <li>Warranty does not cover misuse, accidents, or unauthorized modifications</li>
                    <li>Warranty claims must be made through our customer service</li>
                    <li>See our <Link href="/warranty" className="text-primary hover:underline">Warranty Policy</Link> for details</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">7. Installation Services</h2>
                <div className="text-muted-foreground space-y-4">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Installation services are subject to availability</li>
                    <li>Installation charges are separate from product costs</li>
                    <li>We are not liable for pre-existing vehicle conditions</li>
                    <li>Installation warranty covers workmanship only</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">8. Intellectual Property</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    All content on this website, including text, graphics, logos, images, and software, 
                    is the property of SP Customs or its content suppliers and is protected by intellectual 
                    property laws. You may not reproduce, distribute, or create derivative works without 
                    our express written permission.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">9. Limitation of Liability</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    SP Customs shall not be liable for any indirect, incidental, special, consequential, 
                    or punitive damages arising from your use of our services. Our total liability shall 
                    not exceed the amount paid by you for the specific product or service in question.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">10. Indemnification</h2>
                <div className="text-muted-foreground">
                  <p>
                    You agree to indemnify and hold harmless SP Customs and its affiliates from any claims, 
                    damages, or expenses arising from your use of our services or violation of these terms.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">11. Governing Law</h2>
                <div className="text-muted-foreground">
                  <p>
                    These Terms of Service shall be governed by and construed in accordance with the laws 
                    of India. Any disputes shall be subject to the exclusive jurisdiction of the courts 
                    in Mangaluru, Karnataka.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">12. Changes to Terms</h2>
                <div className="text-muted-foreground">
                  <p>
                    We reserve the right to modify these terms at any time. Changes will be effective 
                    immediately upon posting. Your continued use of our services constitutes acceptance 
                    of the modified terms.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">13. Contact Information</h2>
                <div className="text-muted-foreground">
                  <p>For questions about these Terms of Service, please contact us:</p>
                  <ul className="list-none mt-4 space-y-2">
                    <li><strong>Email:</strong> legal@spcustoms.com</li>
                    <li><strong>Phone:</strong> Contact via WhatsApp or website</li>
                    <li><strong>Address:</strong> 377/6, Kottara, Mangaluru, Karnataka 575006</li>
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
