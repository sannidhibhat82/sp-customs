'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { RotateCcw, CheckCircle, XCircle, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { getWhatsAppUrl } from '@/lib/utils';

const returnableItems = [
  'Unopened products in original packaging',
  'Products with manufacturing defects',
  'Wrong product delivered',
  'Damaged during shipping',
  'Products not matching description',
];

const nonReturnableItems = [
  'Installed products (audio systems, cameras, etc.)',
  'Products without original packaging',
  'Products damaged by misuse',
  'Products purchased more than 7 days ago',
  'Clearance/sale items marked as final sale',
];

export default function ReturnsPage() {
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
              Returns & <span className="text-primary">Refunds</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Easy returns within 7 days. Your satisfaction is our priority.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Return Policy Overview */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">7-Day Return Policy</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer a hassle-free 7-day return policy on most products. If you're not satisfied 
              with your purchase, you can return it within 7 days of delivery for a full refund 
              or exchange.
            </p>
          </div>
        </div>
      </section>

      {/* What Can/Cannot Be Returned */}
      <section className="py-16 bg-secondary/20">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <h3 className="text-xl font-bold">Returnable Items</h3>
              </div>
              <ul className="space-y-3">
                {returnableItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <XCircle className="w-8 h-8 text-red-500" />
                <h3 className="text-xl font-bold">Non-Returnable Items</h3>
              </div>
              <ul className="space-y-3">
                {nonReturnableItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Return Process */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">How to Return</h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Initiate Return', desc: 'Contact us via WhatsApp or email within 7 days of delivery with your order number.' },
              { step: 2, title: 'Approval', desc: 'Our team will review your request and approve eligible returns within 24 hours.' },
              { step: 3, title: 'Ship Product', desc: 'Pack the product securely in original packaging. We\'ll arrange pickup or provide shipping details.' },
              { step: 4, title: 'Quality Check', desc: 'Once received, we\'ll inspect the product to ensure it meets return conditions.' },
              { step: 5, title: 'Refund Processed', desc: 'Refund will be initiated within 3-5 business days to your original payment method.' },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-6 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Refund Timeline */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Refund Timeline</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Payment Method</th>
                  <th className="px-6 py-4 text-left font-semibold">Refund Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { method: 'UPI / Wallets', time: '24-48 hours' },
                  { method: 'Debit Card', time: '5-7 business days' },
                  { method: 'Credit Card', time: '7-10 business days' },
                  { method: 'Net Banking', time: '5-7 business days' },
                  { method: 'Cash on Delivery', time: 'Bank transfer within 5-7 days' },
                ].map((item, i) => (
                  <tr key={item.method} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                    <td className="px-6 py-4">{item.method}</td>
                    <td className="px-6 py-4 text-primary font-medium">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Important Note */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-500/10 rounded-2xl border border-yellow-500/20 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold mb-2">Important Notes</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Original invoice/receipt is required for all returns</li>
                  <li>• Products must be in original condition with all accessories</li>
                  <li>• Shipping charges are non-refundable</li>
                  <li>• For exchange, subject to product availability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Need to Return Something?</h2>
          <p className="text-muted-foreground mb-8">Contact our support team to initiate a return.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={getWhatsAppUrl("Hi! I need to return a product.")} target="_blank">
              <Button size="lg">
                Initiate Return
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/faq">
              <Button size="lg" variant="outline">
                View FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
