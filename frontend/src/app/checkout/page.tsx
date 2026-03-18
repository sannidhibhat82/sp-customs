'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header, Footer, GuestCheckoutModal, LoginModal } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const guestSessionId = api.getGuestSessionId();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const isLoggedIn = api.isCustomerLoggedIn();
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart', guestSessionId],
    queryFn: () => api.getCart(guestSessionId),
  });

  const { data: validateData } = useQuery({
    queryKey: ['checkout-validate', cart?.id, guestSessionId],
    queryFn: () => api.validateCheckout(cart!.id, guestSessionId),
    enabled: !!cart?.id,
  });
  const discountPercent = validateData?.customer_discount_percent ?? 10;

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.listAddresses(),
    enabled: isLoggedIn,
  });

  const saved = (addresses as any[]) ?? [];
  const defaultAddress = saved.find((a) => a.is_default) || saved[0];

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!defaultAddress) return;
    // Prefill address form from default address (only if empty)
    setAddress((a) => {
      if (a.name || a.phone || a.address || a.city || a.state || a.pincode) return a;
      return {
        name: defaultAddress.name || '',
        phone: defaultAddress.phone || '',
        address: defaultAddress.address || '',
        city: defaultAddress.city || '',
        state: defaultAddress.state || '',
        pincode: defaultAddress.pincode || '',
        country: defaultAddress.country || 'India',
      };
    });
  }, [isLoggedIn, defaultAddress]);

  const createOrderMutation = useMutation({
    mutationFn: () =>
      api.createCheckoutOrder({
        cart_id: cart!.id,
        address: {
          name: address.name,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
        },
        guest_session_id: guestSessionId ?? undefined,
      }),
    onSuccess: (data) => {
      const url = data.redirect_url || `/order/success?order_id=${data.order_uuid}`;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.location.href = url;
      } else {
        router.push(url);
      }
    },
    onError: (err: any) => {
      toast({
        title: err.response?.data?.detail || 'Checkout failed',
        variant: 'destructive',
      });
    },
  });

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const isEmpty = !cartLoading && items.length === 0;

  useEffect(() => {
    if (isEmpty && !cartLoading) {
      router.replace('/cart');
    }
  }, [isEmpty, cartLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name.trim() || !address.phone.trim() || !address.address.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      toast({ title: 'Please fill all address fields', variant: 'destructive' });
      return;
    }
    if (!isLoggedIn) {
      setShowGuestModal(true);
      return;
    }
    createOrderMutation.mutate();
  };

  const handleContinueAsGuest = () => {
    setShowGuestModal(false);
    createOrderMutation.mutate();
  };

  if (cartLoading || isEmpty) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 container-wide">
          {cartLoading ? (
            <div className="animate-pulse h-64 rounded-xl bg-secondary/30" />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Your cart is empty.</p>
              <Link href="/cart">
                <Button>Go to cart</Button>
              </Link>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-foreground">Cart</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Checkout</span>
        </nav>
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {!isLoggedIn && discountPercent > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6 text-sm">
            Login to get {discountPercent}% discount and track your order status.
          </div>
        )}
        {isLoggedIn && discountPercent > 0 && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 mb-6 text-sm text-green-700 dark:text-green-400">
            {discountPercent}% discount applied for logged-in users.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Shipping address</h2>
              {isLoggedIn && saved.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground">Use saved address</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {saved.slice(0, 4).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="text-left px-3 py-2 rounded-lg border border-border hover:border-primary/50 bg-background text-sm"
                        onClick={() =>
                          setAddress({
                            name: a.name,
                            phone: a.phone,
                            address: a.address,
                            city: a.city,
                            state: a.state,
                            pincode: a.pincode,
                            country: a.country || 'India',
                          })
                        }
                      >
                        <div className="font-medium flex items-center gap-2">
                          {a.name}
                          {a.is_default ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.city}, {a.state} - {a.pincode}
                        </div>
                      </button>
                    ))}
                    {saved.length > 4 && (
                      <Link href="/account" className="px-3 py-2 rounded-lg border border-border bg-background text-sm hover:border-primary/50">
                        Manage…
                      </Link>
                    )}
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Full name *"
                  value={address.name}
                  onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
                  required
                />
                <Input
                  placeholder="Phone *"
                  value={address.phone}
                  onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Address (street, area) *"
                    value={address.address}
                    onChange={(e) => setAddress((a) => ({ ...a, address: e.target.value }))}
                    required
                  />
                </div>
                <Input
                  placeholder="City *"
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  required
                />
                <Input
                  placeholder="State *"
                  value={address.state}
                  onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                  required
                />
                <Input
                  placeholder="Pincode *"
                  value={address.pincode}
                  onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                  required
                />
                <Input
                  placeholder="Country"
                  value={address.country}
                  onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order summary</h2>
              <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {items.map((item: any) => (
                  <li key={item.id} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded bg-secondary/50 overflow-hidden flex-shrink-0">
                      {item.image_data ? (
                        <img src={getImageSrc(item.image_data)} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.product_name}</p>
                      <p className="text-muted-foreground">
                        {item.quantity} × {formatCurrency(Number(item.unit_price ?? item.price_snapshot?.unit_price ?? 0))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {isLoggedIn && discountPercent > 0 && (
                <div className="border-t border-border pt-2 flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency((subtotal * discountPercent) / 100)}</span>
                </div>
              )}
              <div className="border-t border-border pt-4 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(isLoggedIn && discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal)}</span>
              </div>
              <Button
                type="submit"
                className="w-full mt-6 h-12"
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? 'Placing order…' : 'Place order'}
              </Button>
              <Link href="/cart" className="block mt-3">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to cart
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
      <Footer />

      <GuestCheckoutModal
        open={showGuestModal}
        onOpenChange={setShowGuestModal}
        discountPercent={discountPercent}
        onLogin={() => { setShowGuestModal(false); setShowLoginModal(true); }}
        onContinueAsGuest={handleContinueAsGuest}
      />
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => { setShowLoginModal(false); }}
      />
    </div>
  );
}
