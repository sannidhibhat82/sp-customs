'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '@/components/public';

export default function RefundPolicyPage() {
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
            <RotateCcw className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Refund <span className="text-primary">Policy</span>
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
                This Refund Policy explains when and how SP Customs (“we”, “us”, “our”) processes refunds for purchases made through our website. We aim to resolve eligible return and refund requests fairly and in line with the terms below.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">1. Eligibility for Returns and Refunds</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    You may request a return and refund within 7 (seven) days of delivery for products that are:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Unopened and in original packaging with all accessories</li>
                    <li>Defective or damaged on delivery</li>
                    <li>Incorrectly shipped (wrong product or quantity)</li>
                    <li>Not as described on our website</li>
                  </ul>
                  <p>
                    Original invoice or proof of purchase is required for all return and refund requests.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">2. Non-Refundable and Non-Returnable Items</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    The following are generally not eligible for return or refund:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Products that have been installed, used, or modified (e.g. audio systems, dash cameras, lighting)</li>
                    <li>Products without original packaging or accessories</li>
                    <li>Products damaged due to misuse, accidents, or unauthorized modification</li>
                    <li>Products purchased more than 7 days before the return request</li>
                    <li>Items explicitly marked as final sale or non-returnable at the time of purchase</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">3. How to Request a Return or Refund</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    To initiate a return or refund, contact us within 7 days of delivery via email at contact@spcustoms.in or through our website/WhatsApp, and provide your order number and reason for the request. We will review your request and inform you whether it is eligible. For approved returns, you must pack the product securely in its original packaging (where possible) and send it back or arrange pickup as we instruct. Once we receive and verify the product, we will process the refund in accordance with this policy.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">4. Refund Processing</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Refunds will be credited to the original payment method used for the purchase. Processing times depend on your bank or payment provider: UPI and wallets may reflect within 24–48 hours; card and net banking refunds typically within 5–10 business days. For cash-on-delivery orders, we will process the refund via bank transfer within 5–7 business days after the return is approved and received. We are not responsible for delays caused by banks or payment processors.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">5. Shipping Costs</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Shipping charges paid at the time of order are generally non-refundable, unless the return is due to our error (e.g. wrong or defective product). If we arrange pickup for an approved return, we will communicate any applicable charges, if any, at the time of the return.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">6. Exchanges</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Exchanges are subject to product availability. If you wish to exchange an item, contact us within the return period. We will treat it as a return and, if eligible, process a refund or apply the amount toward a new order as agreed with you.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">7. Disputes and Refusal</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We reserve the right to refuse returns that do not meet the conditions in this policy or that appear to be fraudulent. If you disagree with our decision, you may contact us at contact@spcustoms.in with your order details and we will try to resolve the matter in good faith.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">8. Changes to This Policy</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    We may update this Refund Policy from time to time. The current version will be posted on this page with an updated “Last updated” date. The policy in effect at the time of your purchase applies to your order.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">9. Contact Us</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    For questions about returns or refunds, or this policy, contact us at:
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
