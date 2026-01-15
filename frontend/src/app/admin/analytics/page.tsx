'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Globe,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  Settings,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  
  // Check if GA is configured
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isConfigured = !!gaId;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const features = [
    {
      icon: Users,
      title: 'Visitor Tracking',
      description: 'See how many users visit your site daily, weekly, and monthly',
    },
    {
      icon: Globe,
      title: 'Traffic Sources',
      description: 'Know where your visitors come from - Google, social media, direct, etc.',
    },
    {
      icon: TrendingUp,
      title: 'User Behavior',
      description: 'Track page views, session duration, and popular products',
    },
    {
      icon: BarChart3,
      title: 'Real-time Data',
      description: 'See who is on your site right now and what they are viewing',
    },
  ];

  const setupSteps = [
    {
      step: 1,
      title: 'Create Google Analytics Account',
      description: 'Go to Google Analytics and sign in with your Google account',
      link: 'https://analytics.google.com/',
    },
    {
      step: 2,
      title: 'Create a Property',
      description: 'Click "Admin" → "Create Property" → Enter your website name and URL',
    },
    {
      step: 3,
      title: 'Get Measurement ID',
      description: 'Go to "Data Streams" → "Web" → Copy the Measurement ID (starts with G-)',
    },
    {
      step: 4,
      title: 'Add to Environment',
      description: 'Add the ID to your .env.local file and restart the server',
      code: 'NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Track visitors, traffic sources, and user behavior
          </p>
        </div>
        {isConfigured && (
          <a
            href={`https://analytics.google.com/analytics/web/#/report-home/a${gaId?.replace('G-', '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Google Analytics
            </Button>
          </a>
        )}
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={cn(
          "border-2",
          isConfigured ? "border-green-500/50 bg-green-500/5" : "border-yellow-500/50 bg-yellow-500/5"
        )}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {isConfigured ? (
                <CheckCircle2 className="w-10 h-10 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-10 h-10 text-yellow-500 shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={cn(
                  "text-lg font-semibold",
                  isConfigured ? "text-green-500" : "text-yellow-500"
                )}>
                  {isConfigured ? 'Google Analytics is Active' : 'Google Analytics Not Configured'}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {isConfigured 
                    ? `Tracking ID: ${gaId} - Your website is now tracking visitor data.`
                    : 'Follow the setup guide below to start tracking your website visitors.'
                  }
                </p>
                {isConfigured && (
                  <div className="mt-4 flex gap-3">
                    <a
                      href="https://analytics.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Dashboard
                      </Button>
                    </a>
                    <a
                      href="https://analytics.google.com/analytics/web/#/realtime"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        Real-time Visitors
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-6">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Setup Guide */}
      {!isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Setup Guide
            </CardTitle>
            <CardDescription>
              Follow these steps to enable Google Analytics for your website (Free)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupSteps.map((step, index) => (
              <div key={step.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                  {step.step}
                </div>
                <div className="flex-1 pb-6 border-b border-border last:border-0 last:pb-0">
                  <h4 className="font-semibold mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Google Analytics
                      </Button>
                    </a>
                  )}
                  
                  {step.code && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 px-4 py-2 bg-secondary rounded-lg font-mono text-sm">
                        {step.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(step.code!, 'Code')}
                      >
                        {copied === 'Code' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-primary mb-2">After Setup</h4>
              <p className="text-sm text-muted-foreground">
                Once configured, it may take 24-48 hours for data to appear in your Google Analytics dashboard. 
                Real-time data will be available immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links for configured users */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Common reports and dashboards in Google Analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { 
                  title: 'Overview', 
                  description: 'General website performance',
                  url: 'https://analytics.google.com/',
                  icon: BarChart3,
                },
                { 
                  title: 'Real-time', 
                  description: 'See live visitors on your site',
                  url: 'https://analytics.google.com/analytics/web/#/realtime',
                  icon: Users,
                },
                { 
                  title: 'Acquisition', 
                  description: 'Traffic sources and channels',
                  url: 'https://analytics.google.com/analytics/web/#/report/acquisition-overview',
                  icon: Globe,
                },
                { 
                  title: 'Engagement', 
                  description: 'Pages, events, and conversions',
                  url: 'https://analytics.google.com/analytics/web/#/report/engagement-overview',
                  icon: TrendingUp,
                },
                { 
                  title: 'Demographics', 
                  description: 'User location and devices',
                  url: 'https://analytics.google.com/analytics/web/#/report/visitors-demographics',
                  icon: Users,
                },
                { 
                  title: 'Settings', 
                  description: 'Configure analytics property',
                  url: 'https://analytics.google.com/analytics/web/#/admin',
                  icon: Settings,
                },
              ].map((link) => (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <div className="flex items-start justify-between">
                      <link.icon className="w-8 h-8 text-primary mb-3" />
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h4 className="font-semibold mb-1">{link.title}</h4>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-secondary/30">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Why Google Analytics?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>100% Free</strong> - No limits on data or features for most websites</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Comprehensive</strong> - Track visitors, sources, behavior, and conversions</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Real-time</strong> - See who is on your site right now</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Integration</strong> - Works with Google Ads, Search Console, and more</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
