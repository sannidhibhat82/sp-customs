'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Looker Studio embed URL
  const lookerStudioUrl = process.env.NEXT_PUBLIC_LOOKER_STUDIO_URL;

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
        <div className="flex gap-2">
          {lookerStudioUrl && (
            <Button variant="outline" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Google Analytics
            </Button>
          </a>
        </div>
      </div>

      {/* Embedded Dashboard */}
      {lookerStudioUrl ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            isFullscreen && "fixed inset-0 z-50 bg-background p-4"
          )}
        >
          <Card className="h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Live Analytics Dashboard
                </CardTitle>
                <CardDescription>
                  Real-time website analytics from Google
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className={cn(
                "w-full bg-secondary/20 rounded-b-lg overflow-hidden",
                isFullscreen ? "h-[calc(100vh-120px)]" : "h-[700px]"
              )}>
                <iframe
                  key={refreshKey}
                  src={lookerStudioUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="border-2 border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics Not Configured</h3>
            <p className="text-muted-foreground mb-4">
              Add your Looker Studio embed URL to view analytics here.
            </p>
            <code className="block px-4 py-2 bg-secondary rounded-lg font-mono text-sm mb-4">
              NEXT_PUBLIC_LOOKER_STUDIO_URL=https://lookerstudio.google.com/embed/...
            </code>
            <a
              href="https://lookerstudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>
                <ExternalLink className="w-4 h-4 mr-2" />
                Create Dashboard in Looker Studio
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
