'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const sendOtpMutation = useMutation({
    mutationFn: () => api.sendOtp(phone.trim(), name.trim() || undefined),
    onSuccess: () => {
      setStep('otp');
      toast({
        title: 'OTP sent on WhatsApp',
        description: 'Check messages for this number on WhatsApp.',
        variant: 'success',
      });
    },
    onError: (err: any) => {
      toast({ title: err.response?.data?.detail || 'Failed to send OTP', variant: 'destructive' });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => api.verifyOtp(phone.trim(), otp.trim(), name.trim() || undefined),
    onSuccess: () => {
      toast({ title: 'Logged in', variant: 'success' });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: err.response?.data?.detail || 'Invalid OTP', variant: 'destructive' });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: 'Enter mobile number', variant: 'destructive' });
      return;
    }
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({ title: 'Enter OTP', variant: 'destructive' });
      return;
    }
    verifyOtpMutation.mutate();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('phone');
      setOtp('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="WhatsApp mobile number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              We’ll send a one-time code to this number on WhatsApp. Use the number registered on WhatsApp.
            </p>
            <Button type="submit" className="w-full" disabled={sendOtpMutation.isPending}>
              {sendOtpMutation.isPending ? 'Sending…' : 'Send OTP on WhatsApp'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your WhatsApp chat (sent to {phone}).
            </p>
            <Input
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('phone')} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={verifyOtpMutation.isPending}>
                {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
