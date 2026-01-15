'use client';

import { motion } from 'framer-motion';
import { Wrench, Clock, Mail } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Wrench className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">SP CUSTOMS</h1>
        </div>

        {/* Message */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Under Maintenance</h2>
          <p className="text-muted-foreground mb-6">
            We're currently performing scheduled maintenance to improve your experience. 
            We'll be back shortly!
          </p>

          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Questions? Contact us at support@spcustoms.com
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-sm text-muted-foreground">
          Thank you for your patience
        </p>
      </motion.div>
    </div>
  );
}
