'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrderByUuid(orderId!),
    enabled: !!orderId,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        {!orderId ? (
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-muted-foreground mb-6">No order reference found.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
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
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Thank you for your order</h1>
            <p className="text-muted-foreground mb-6">
              Order <strong>{order.order_number}</strong> has been placed successfully.
            </p>
            <div className="rounded-xl border border-border bg-card p-6 text-left mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Order number</span>
                <span className="font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{order.payment_status || order.status || 'Pending'}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              We will process your order and ship it soon. You can contact us on WhatsApp for any queries.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/products">
                <Button>
                  Continue shopping
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to home
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
