'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Truck, Clock, MapPin, Package, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';

const deliveryZones = [
  { zone: 'Metro Cities', cities: 'Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad', time: '2-3 Business Days' },
  { zone: 'Tier 1 Cities', cities: 'Pune, Ahmedabad, Jaipur, Lucknow, etc.', time: '3-5 Business Days' },
  { zone: 'Tier 2 Cities', cities: 'Smaller cities and towns', time: '5-7 Business Days' },
  { zone: 'Remote Areas', cities: 'Rural and remote locations', time: '7-10 Business Days' },
];

const features = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹2000' },
  { icon: Package, title: 'Secure Packaging', desc: 'Products safely packed' },
  { icon: Clock, title: 'Real-time Tracking', desc: 'Track your shipment' },
  { icon: MapPin, title: 'Pan India Delivery', desc: 'We deliver everywhere' },
];

export default function ShippingPage() {
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
              Shipping <span className="text-primary">Information</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Fast and reliable delivery across India. Track your orders in real-time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="container-wide">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Rates */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Shipping Rates</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-8"
            >
              <h3 className="text-xl font-bold mb-4 text-primary">Standard Shipping</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center pb-4 border-b border-border">
                  <span>Orders above ₹2000</span>
                  <span className="font-bold text-green-500">FREE</span>
                </li>
                <li className="flex justify-between items-center pb-4 border-b border-border">
                  <span>Orders ₹1000 - ₹2000</span>
                  <span className="font-bold">₹49</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Orders below ₹1000</span>
                  <span className="font-bold">₹99</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-8"
            >
              <h3 className="text-xl font-bold mb-4 text-primary">Express Shipping</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center pb-4 border-b border-border">
                  <span>Metro Cities (1-2 days)</span>
                  <span className="font-bold">₹149</span>
                </li>
                <li className="flex justify-between items-center pb-4 border-b border-border">
                  <span>Tier 1 Cities (2-3 days)</span>
                  <span className="font-bold">₹199</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Other Locations</span>
                  <span className="font-bold">₹249</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Delivery Times */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Estimated Delivery Times</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Zone</th>
                  <th className="px-6 py-4 text-left font-semibold hidden sm:table-cell">Coverage</th>
                  <th className="px-6 py-4 text-left font-semibold">Delivery Time</th>
                </tr>
              </thead>
              <tbody>
                {deliveryZones.map((zone, i) => (
                  <tr key={zone.zone} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                    <td className="px-6 py-4 font-medium">{zone.zone}</td>
                    <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">{zone.cities}</td>
                    <td className="px-6 py-4 text-primary font-medium">{zone.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Order Process */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Order Process</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Order Placed', desc: 'Confirmation email sent' },
              { step: 2, title: 'Processing', desc: 'Order packed & ready' },
              { step: 3, title: 'Shipped', desc: 'Tracking number shared' },
              { step: 4, title: 'Delivered', desc: 'At your doorstep' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Have Questions About Shipping?</h2>
          <p className="text-muted-foreground mb-8">Contact us for any shipping-related queries.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/faq">
              <Button size="lg">
                View FAQ
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
