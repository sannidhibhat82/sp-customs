'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.getMyOrders({ page_size: 50 }),
  });

  useEffect(() => {
    if (!api.getToken()) {
      router.replace('/');
      return;
    }
  }, [router]);

  if (!api.getToken()) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">My Orders</span>
        </nav>
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>

        {isLoading ? (
          <div className="animate-pulse h-64 rounded-xl bg-secondary/30" />
        ) : !orders?.length ? (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">You have no orders yet.</p>
            <Link href="/products">
              <Button>Browse products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(orders as any[]).map((order: any) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.shipping_info?.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(order.total))}</p>
                    <p className="text-xs text-muted-foreground">{order.item_count} item(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground w-full sm:w-auto">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
