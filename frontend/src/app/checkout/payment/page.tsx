'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function CheckoutPaymentPage() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderUuid = mounted ? searchParams.get('order_uuid') : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderUuid],
    queryFn: () => api.getOrderByUuid(orderUuid!),
    enabled: !!orderUuid,
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (orderId: number) => api.confirmPaymentSuccess(orderId),
    onSuccess: () => {
      router.push(`/order/success?order_id=${order?.uuid}`);
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.detail || 'Payment confirmation failed',
        variant: 'destructive',
      });
    },
  });

  // If already paid, redirect to success
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
              <p className="text-xs text-muted-foreground mt-3">
                Click Pay to confirm payment. You will be redirected to the order success page.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => confirmPaymentMutation.mutate(order.id)}
                disabled={confirmPaymentMutation.isPending}
              >
                {confirmPaymentMutation.isPending ? 'Processing…' : `Pay ${formatCurrency(order.total)}`}
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
