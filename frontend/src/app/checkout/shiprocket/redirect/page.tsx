'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '@/components/public';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

function ShiprocketRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderUuid = searchParams.get('order_uuid') || '';
  const oid = searchParams.get('oid') || '';
  const ost = searchParams.get('ost') || '';

  const isSuccess = useMemo(() => ['SUCCESS', 'PAID', 'COMPLETED'].includes((ost || '').toUpperCase()), [ost]);
  const [autoRedirectIn, setAutoRedirectIn] = useState<number | null>(null);

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmShiprocketRedirect({ order_uuid: orderUuid, oid, ost }),
    onSuccess: () => {
      setAutoRedirectIn(800);
      setTimeout(() => {
        router.replace(`/order/success?order_id=${orderUuid}`);
      }, 800);
    },
    onError: (err: any) => {
      toast({
        title: err?.response?.data?.detail || 'Payment confirmation failed',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!orderUuid || !oid || !ost) return;
    if (!isSuccess) return;
    confirmMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderUuid, oid, ost, isSuccess]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <div className="max-w-lg mx-auto text-center py-12">
          {!orderUuid ? (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Missing order reference</h1>
              <p className="text-muted-foreground mb-6">We couldn’t identify your order.</p>
              <Link href="/cart">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to cart
                </Button>
              </Link>
            </>
          ) : isSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment received</h1>
              <p className="text-muted-foreground mb-6">
                {confirmMutation.isPending
                  ? 'Finalizing your order…'
                  : autoRedirectIn
                    ? 'Redirecting to your order…'
                    : 'Your order is confirmed.'}
              </p>
              <Button onClick={() => router.replace(`/order/success?order_id=${orderUuid}`)}>
                View order
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment not completed</h1>
              <p className="text-muted-foreground mb-6">
                Status: <span className="font-medium">{ost || 'Unknown'}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/checkout/shiprocket/pay?order_uuid=${encodeURIComponent(orderUuid)}`}>
                  <Button>Try again</Button>
                </Link>
                <Link href="/cart">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to cart
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function RedirectFallback() {
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

export default function ShiprocketRedirectPage() {
  return (
    <Suspense fallback={<RedirectFallback />}>
      <ShiprocketRedirectContent />
    </Suspense>
  );
}
