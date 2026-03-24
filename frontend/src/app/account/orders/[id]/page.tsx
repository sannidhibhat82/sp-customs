'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Truck, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc } from '@/lib/utils';

export default function AccountOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: ['my-order', id],
    queryFn: () => api.getMyOrder(id),
    enabled: !!id && !isNaN(id),
  });

  useEffect(() => {
    if (!api.getToken()) {
      router.replace('/');
      return;
    }
  }, [router]);

  if (!api.getToken() || !id) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 container-wide">
          <div className="animate-pulse h-96 rounded-xl bg-secondary/30" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 container-wide text-center">
          <p className="text-muted-foreground mb-4">Order not found.</p>
          <Link href="/account/orders">
            <Button>Back to orders</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const shipping = order.shipping_info || {};
  const shippingDetails = order.shipping_details || {};
  const items = order.items || [];
  const scanTimeline = (
    shippingDetails.shiprocket_webhook?.scans ||
    shippingDetails.shiprocket_pickup_response?.response?.shipment_track_activities ||
    []
  ) as Array<{ date?: string; activity?: string; location?: string }>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/account/orders" className="hover:text-foreground">My Orders</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{order.order_number}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {order.status}
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" />
              Shipping address
            </h2>
            <p className="font-medium">{shipping.customer_name}</p>
            <p className="text-sm text-muted-foreground">{shipping.phone}</p>
            <p className="text-sm mt-2">
              {shipping.address_line1}
              {shipping.address_line2 && `, ${shipping.address_line2}`}
            </p>
            <p className="text-sm">{shipping.city}, {shipping.state} - {shipping.postal_code}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4" />
              Tracking
            </h2>
            {order.tracking_id ? (
              <div className="space-y-2">
                <p className="font-mono text-primary">{order.tracking_id}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {order.shipment_status ? (
                    <span className="px-2 py-1 rounded-full bg-secondary/60">
                      {String(order.shipment_status)}
                    </span>
                  ) : null}
                  <a
                    href={`https://shiprocket.co/tracking/${encodeURIComponent(order.tracking_id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Track online <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tracking will appear after shipment.</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Payment: {order.payment_status || '—'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <h2 className="font-semibold p-4 border-b border-border flex items-center gap-2">
            <Package className="w-4 h-4" />
            Items ({items.length})
          </h2>
          <ul className="divide-y divide-border">
            {(items as any[]).map((item: any) => (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="w-16 h-16 rounded-lg bg-secondary/50 overflow-hidden flex-shrink-0">
                  {item.product_image && (
                    <img src={getImageSrc(item.product_image)} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && <p className="text-sm text-muted-foreground">{item.variant_name}</p>}
                  <p className="text-sm text-muted-foreground">{item.quantity} × {formatCurrency(Number(item.unit_price))}</p>
                </div>
                <div className="text-right font-semibold">
                  {formatCurrency(Number(item.total))}
                </div>
              </li>
            ))}
          </ul>
          <div className="p-4 border-t border-border flex justify-end">
            <div className="text-right space-y-1">
              {Number(order.discount_amount) > 0 && (
                <p className="text-sm text-green-600">Discount -{formatCurrency(Number(order.discount_amount))}</p>
              )}
              <p className="text-lg font-bold">Total {formatCurrency(Number(order.total))}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mt-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4" />
            Shipment Activity
          </h2>
          {!scanTimeline.length ? (
            <p className="text-sm text-muted-foreground">No shipment activity yet. Updates appear here automatically.</p>
          ) : (
            <ol className="space-y-3">
              {scanTimeline.map((scan, idx) => (
                <li key={`${scan.date || 'd'}-${idx}`} className="relative pl-5">
                  <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary/70" />
                  <p className="text-sm font-medium">{scan.activity || 'Status update'}</p>
                  <p className="text-xs text-muted-foreground">
                    {[scan.date, scan.location].filter(Boolean).join(' • ') || '—'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-6">
          <Link href="/account/orders">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to orders
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
