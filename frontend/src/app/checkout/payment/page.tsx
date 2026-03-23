'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, callback: (resp: any) => void) => void;
    };
  }
}

function useScript(src: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    script.onerror = () => {
      if (!cancelled) setError('Failed to load Razorpay checkout script');
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return { loaded, error };
}

function CheckoutPaymentContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderUuid = mounted ? searchParams.get('order_uuid') : null;
  const { loaded: razorpayLoaded, error: razorpayScriptError } = useScript('https://checkout.razorpay.com/v1/checkout.js');

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderUuid],
    queryFn: () => api.getOrderByUuid(orderUuid!),
    enabled: !!orderUuid,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: {
      order_uuid: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => api.verifyRazorpayPayment(payload),
    onSuccess: () => {
      router.replace(`/order/success?order_id=${order?.uuid}`);
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.detail || 'Payment verification failed',
        variant: 'destructive',
      });
    },
  });

  const openRazorpayMutation = useMutation({
    mutationFn: async () => {
      if (!orderUuid) throw new Error('Missing order reference');
      if (!window.Razorpay) throw new Error('Razorpay checkout is not available');
      const rpOrder = await api.createRazorpayOrder(orderUuid);
      return rpOrder;
    },
    onSuccess: (rpOrder) => {
      if (!window.Razorpay) return;
      const rz = new window.Razorpay({
        key: rpOrder.key_id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: rpOrder.name,
        description: rpOrder.description,
        order_id: rpOrder.razorpay_order_id,
        prefill: rpOrder.prefill,
        handler: (response: any) => {
          verifyPaymentMutation.mutate({
            order_uuid: rpOrder.order_uuid,
            razorpay_order_id: response?.razorpay_order_id || '',
            razorpay_payment_id: response?.razorpay_payment_id || '',
            razorpay_signature: response?.razorpay_signature || '',
          });
        },
        modal: {
          ondismiss: () => {
            toast({ title: 'Payment popup closed' });
          },
        },
        theme: {
          color: '#111827',
        },
      });
      rz.on('payment.failed', (resp: any) => {
        const reason = resp?.error?.description || 'Payment failed';
        toast({ title: reason, variant: 'destructive' });
      });
      rz.open();
    },
    onError: (err: any) => {
      toast({
        title: err?.response?.data?.detail || err?.message || 'Unable to start Razorpay checkout',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (order?.payment_status === 'success') {
      router.replace(`/order/success?order_id=${order.uuid}`);
    }
  }, [order?.payment_status, order?.uuid, router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        {!mounted ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="animate-pulse h-32 rounded-xl bg-secondary/30" />
          </div>
        ) : !orderUuid ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-muted-foreground mb-6">No order reference found.</p>
            <Link href="/cart">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to cart
              </Button>
            </Link>
          </div>
        ) : isLoading ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="animate-pulse h-32 rounded-xl bg-secondary/30" />
          </div>
        ) : error || !order ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-muted-foreground mb-6">Order not found or failed to load.</p>
            <Link href="/cart">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to cart
              </Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-lg mx-auto py-12">
            <div className="rounded-xl border border-border bg-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Complete your payment</h1>
                  <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-semibold text-lg">{formatCurrency(order.total)}</span>
              </div>
              {razorpayScriptError ? (
                <p className="text-sm text-red-600 mt-2">{razorpayScriptError}</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-3">
                Click Pay to open Razorpay checkout. On success, we verify and confirm your order.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => openRazorpayMutation.mutate()}
                disabled={openRazorpayMutation.isPending || verifyPaymentMutation.isPending || !razorpayLoaded}
              >
                {openRazorpayMutation.isPending || verifyPaymentMutation.isPending ? 'Processing…' : `Pay ${formatCurrency(order.total)}`}
              </Button>
              <Link href="/cart" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function PaymentFallback() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="animate-pulse h-32 rounded-xl bg-secondary/30" />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense fallback={<PaymentFallback />}>
      <CheckoutPaymentContent />
    </Suspense>
  );
}
