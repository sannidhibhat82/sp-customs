'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { getWhatsAppUrl } from '@/lib/utils';

const warrantyTerms = [
  {
    title: 'What\'s Covered',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    items: [
      'Manufacturing defects',
      'Electrical component failures',
      'Hardware malfunctions',
      'Quality issues with materials',
      'Installation-related problems (if installed by us)',
    ],
  },
  {
    title: 'What\'s Not Covered',
    icon: XCircle,
    iconColor: 'text-red-500',
    items: [
      'Physical damage or misuse',
      'Water damage or exposure',
      'Unauthorized modifications',
      'Normal wear and tear',
      'Damage from accidents or theft',
    ],
  },
];

const warrantyPeriods = [
  { category: 'Car Audio Systems', period: '1-2 Years', note: 'Varies by brand' },
  { category: 'Dash Cameras', period: '1 Year', note: 'Standard warranty' },
  { category: 'LED Lights', period: '6 Months', note: 'Against defects' },
  { category: 'Phone Mounts', period: '6 Months', note: 'Mechanical parts' },
  { category: 'Electronic Accessories', period: '6-12 Months', note: 'Varies by product' },
  { category: 'Installation Work', period: '6 Months', note: 'SP Customs installations' },
];

export default function WarrantyPage() {
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
              Warranty <span className="text-primary">Information</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              All products purchased from SP Customs come with manufacturer warranty 
              for your peace of mind.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Warranty Periods */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Warranty Periods</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Product Category</th>
                  <th className="px-6 py-4 text-left font-semibold">Warranty Period</th>
                  <th className="px-6 py-4 text-left font-semibold hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {warrantyPeriods.map((item, i) => (
                  <tr key={item.category} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                    <td className="px-6 py-4">{item.category}</td>
                    <td className="px-6 py-4 text-primary font-medium">{item.period}</td>
                    <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Coverage Details */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {warrantyTerms.map((section) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl border border-border p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <section.icon className={`w-8 h-8 ${section.iconColor}`} />
                  <h3 className="text-xl font-bold">{section.title}</h3>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 ${section.iconColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Claim */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">How to Claim Warranty</h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Contact Us', desc: 'Reach out via WhatsApp or email with your order number and issue description.' },
              { step: 2, title: 'Share Details', desc: 'Provide photos or videos of the issue along with your invoice/receipt.' },
              { step: 3, title: 'Assessment', desc: 'Our team will assess the issue and determine if it falls under warranty.' },
              { step: 4, title: 'Resolution', desc: 'We\'ll repair, replace, or refund the product based on the assessment.' },
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

      {/* Important Note */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold mb-2">Important Notes</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Keep your original invoice/receipt for warranty claims</li>
                  <li>• Warranty is valid only for the original purchaser</li>
                  <li>• Products must be used as intended per manufacturer guidelines</li>
                  <li>• Warranty periods start from the date of purchase</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help with Warranty?</h2>
          <p className="text-muted-foreground mb-8">Contact our support team for any warranty-related queries.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={getWhatsAppUrl("Hi! I need help with a warranty claim.")} target="_blank">
              <Button size="lg">
                Contact Support
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
