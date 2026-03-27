'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Truck, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '@/components/public';

export default function ShippingPolicyPage() {
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
            <Truck className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Shipping <span className="text-primary">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: March 2025
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
                This Shipping Policy describes how SP Customs (“we”, “us”, “our”) delivers products ordered through our website. By placing an order, you agree to the terms set out below. We deliver across India and aim to process and ship orders in a timely manner.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">1. Delivery Areas</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We ship to addresses within India. Delivery timeframes vary by location (e.g. metro cities, tier 1 and tier 2 cities, and remote areas). We are not responsible for delays caused by the shipping carrier, customs, or circumstances outside our control.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">2. Order Processing</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Orders are processed on business days. Once your order is confirmed and payment is received, we will pack and hand over the shipment to our logistics partner. You will receive order and tracking details (where applicable) via email or phone.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">3. Shipping Costs</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Shipping charges, if any, will be shown at checkout before you complete payment. We may offer free or discounted shipping on certain orders as per our promotions. Shipping costs are non-refundable except where required by law or as stated in our Refund Policy.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">4. Delivery Timeframes</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Estimated delivery times are indicative only and not guaranteed. Factors such as location, carrier capacity, and weather may affect delivery. We will make reasonable efforts to meet stated estimates but are not liable for delays beyond our control.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">5. Tracking and Responsibility</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Where tracking is available, we will share the tracking information with you. Risk of loss and title for the goods pass to you upon delivery to the address you provided. It is your responsibility to ensure someone is available to receive the delivery where required.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">6. Incorrect or Incomplete Address</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    You are responsible for providing an accurate and complete shipping address. We are not liable for failed or delayed delivery due to incorrect or incomplete address details. Additional charges may apply for re-shipment if a delivery fails for this reason.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">7. Changes to This Policy</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We may update this Shipping Policy from time to time. The current version will be posted on this page with an updated “Last updated” date. Your continued use of our site or services after changes constitutes acceptance of the revised policy.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">8. Contact Us</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    For questions about shipping or this policy, contact us at:
                  </p>
                  <ul className="list-none mt-4 space-y-2">
                    <li><strong>Email:</strong> contact@spcustoms.in</li>
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
