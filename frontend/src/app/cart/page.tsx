'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const guestSessionId = api.getGuestSessionId();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', guestSessionId],
    queryFn: () => api.getCart(guestSessionId),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      api.updateCartItem(itemId, quantity, guestSessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Update failed', variant: 'destructive' }),
  });
  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => api.removeCartItem(itemId, guestSessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Remove failed', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 container-wide">
          <div className="animate-pulse h-64 rounded-xl bg-secondary/30" />
        </div>
        <Footer />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Cart</span>
        </nav>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="w-7 h-7" />
          Your Cart
        </h1>

        {isEmpty ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground mb-6">Your cart is empty.</p>
            <Link href="/products">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <Link
                    href={`/products/${item.product_slug || item.product_id}`}
                    className="flex gap-4 flex-1 min-w-0"
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0">
                      {item.image_data ? (
                        <img
                          src={getImageSrc(item.image_data)}
                          alt={item.product_name || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate hover:text-primary transition-colors">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(Number(item.unit_price ?? item.price_snapshot?.unit_price ?? 0))}
                      </p>
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold">
                      {formatCurrency(Number(item.unit_price ?? item.price_snapshot?.unit_price ?? 0) * item.quantity)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-border bg-background overflow-hidden">
                        <button
                          type="button"
                          className="h-9 w-9 grid place-items-center hover:bg-secondary/50 disabled:opacity-50"
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.quantity <= 1) return;
                            updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                          }}
                          disabled={updateItemMutation.isPending || item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="min-w-10 px-3 text-sm font-medium tabular-nums text-center">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          className="h-9 w-9 grid place-items-center hover:bg-secondary/50 disabled:opacity-50"
                          onClick={(e) => {
                            e.preventDefault();
                            updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 });
                          }}
                          disabled={updateItemMutation.isPending}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItemMutation.mutate(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border bg-card p-6 sticky top-24">
                <h2 className="text-lg font-semibold mb-4">Summary</h2>
                <div className="flex justify-between text-muted-foreground mb-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="border-t border-border pt-4 mt-4 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <Button
                  className="w-full mt-6 h-12"
                  onClick={() => router.push('/checkout')}
                >
                  Proceed to checkout
                </Button>
                <Link href="/products" className="block mt-3">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Continue shopping
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
