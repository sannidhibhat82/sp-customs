'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Header, Footer } from '@/components/public';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (event: any, token: string, opts: any) => void;
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
      if (!cancelled) setError('Failed to load Shiprocket checkout script');
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return { loaded, error };
}

function ShiprocketPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderUuid = searchParams.get('order_uuid') || '';

  const { loaded: srLoaded, error: srScriptError } = useScript(
    'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js'
  );

  useEffect(() => {
    const href = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, []);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderUuid],
    queryFn: () => api.getOrderByUuid(orderUuid),
    enabled: !!orderUuid,
  });

  const tokenQuery = useQuery({
    queryKey: ['shiprocket-token', orderUuid],
    queryFn: () => api.getShiprocketCheckoutToken(orderUuid),
    enabled: !!orderUuid,
    retry: 1,
  });

  const startCheckoutMutation = useMutation({
    mutationFn: async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!srLoaded) throw new Error('Shiprocket checkout script not loaded yet');
      const tokenResp = tokenQuery.data;
      const token = tokenResp?.token;
      if (!token) throw new Error('Missing Shiprocket token');
      if (!window.HeadlessCheckout?.addToCart) throw new Error('Shiprocket checkout is not available');

      const fallbackUrl = `${window.location.origin}/checkout/shiprocket/redirect?order_uuid=${encodeURIComponent(orderUuid)}`;
      window.HeadlessCheckout.addToCart(e.nativeEvent, token, { fallbackUrl, isInitiatedFromApp: true });
    },
    onError: (err: any) => {
      toast({
        title: err?.message || 'Unable to start payment',
        variant: 'destructive',
      });
    },
  });

  const paid = useMemo(() => order?.payment_status === 'success', [order?.payment_status]);

  useEffect(() => {
    if (paid && order?.uuid) router.replace(`/order/success?order_id=${order.uuid}`);
  }, [paid, order?.uuid, router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        {!orderUuid ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-muted-foreground mb-6">No order reference found.</p>
            <Link href="/cart">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to cart
              </Button>
            </Link>
          </div>
        ) : orderLoading ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="animate-pulse h-32 rounded-xl bg-secondary/30" />
          </div>
        ) : !order ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-muted-foreground mb-6">Order not found.</p>
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
                  <h1 className="text-xl font-semibold">Pay with Shiprocket</h1>
                  <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
                </div>
              </div>
              {srScriptError ? (
                <p className="text-sm text-red-600">{srScriptError}</p>
              ) : null}
              {tokenQuery.isError ? (
                <p className="text-sm text-red-600">Failed to get Shiprocket token.</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-3">
                Clicking “Pay” will open Shiprocket Checkout. After payment, you’ll return here automatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={(e) => startCheckoutMutation.mutate(e)}
                disabled={
                  startCheckoutMutation.isPending ||
                  !srLoaded ||
                  tokenQuery.isLoading ||
                  !tokenQuery.data?.token
                }
              >
                {startCheckoutMutation.isPending ? 'Opening…' : 'Pay now'}
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

function PayFallback() {
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

export default function ShiprocketPayPage() {
  return (
    <Suspense fallback={<PayFallback />}>
      <ShiprocketPayContent />
    </Suspense>
  );
}
