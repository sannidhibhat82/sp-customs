'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface GuestCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
  onContinueAsGuest: () => void;
  discountPercent?: number;
}

export default function GuestCheckoutModal({
  open,
  onOpenChange,
  onLogin,
  onContinueAsGuest,
  discountPercent = 10,
}: GuestCheckoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Continue to checkout</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Login is optional. Login to get {discountPercent}% discount and track your order status.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={onLogin}>Login</Button>
          <Button variant="outline" onClick={onContinueAsGuest}>
            Continue as Guest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
