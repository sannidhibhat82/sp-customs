'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Users, 
  Award, 
  Shield, 
  Truck, 
  Heart, 
  Target,
  CheckCircle,
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';

const stats = [
  { value: '500+', label: 'Products' },
  { value: '50+', label: 'Brands' },
  { value: '1000+', label: 'Happy Customers' },
  { value: '5+', label: 'Years Experience' },
];

const values = [
  {
    icon: Award,
    title: 'Quality First',
    description: 'We only stock products from trusted brands that meet our high standards.',
  },
  {
    icon: Shield,
    title: 'Warranty Protection',
    description: 'All our products come with manufacturer warranty for your peace of mind.',
  },
  {
    icon: Users,
    title: 'Expert Support',
    description: 'Our team of car enthusiasts is always ready to help you choose the right products.',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Quick and safe delivery across India with real-time tracking.',
  },
];

const features = [
  'Premium quality car gadgets and accessories',
  'Expert installation services available',
  'Competitive pricing with best value',
  'Easy returns and exchange policy',
  'Dedicated customer support',
  'Wide range of trusted brands',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              About SP Customs
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Trusted Partner for{' '}
              <span className="text-primary">Premium Car Gadgets</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              At SP Customs, we're passionate about helping car enthusiasts transform their vehicles 
              with the best gadgets and accessories in the market.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  SP Customs was founded with a simple mission: to bring the best car gadgets 
                  and accessories to vehicle enthusiasts across India. What started as a small 
                  passion project has grown into a trusted destination for thousands of customers.
                </p>
                <p>
                  We understand that your car is more than just a vehicle – it's an extension 
                  of your personality. That's why we carefully curate our collection to include 
                  only the highest quality products from renowned brands.
                </p>
                <p>
                  Our team of experts is always ready to help you find the perfect upgrades 
                  for your vehicle, whether it's a premium audio system, dash camera, or 
                  interior accessories.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6">Why Choose Us?</h3>
              <ul className="space-y-4">
                {features.map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These core values guide everything we do at SP Customs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Heart className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Ride?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Browse our collection of premium car gadgets and accessories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="text-lg px-8">
                  Explore Products
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
