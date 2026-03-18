'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header, Footer } from '@/components/public';
import { api } from '@/lib/api';
import { formatCurrency, getImageSrc } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function AccountFavoritesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.getFavorites(),
  });

  useEffect(() => {
    if (!api.getToken()) {
      router.replace('/');
      return;
    }
  }, [router]);

  const removeMutation = useMutation({
    mutationFn: (productId: number) => api.removeFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({ title: 'Removed from favourites', variant: 'success' });
    },
    onError: (err: any) => {
      toast({ title: err.response?.data?.detail || 'Failed to remove', variant: 'destructive' });
    },
  });

  if (!api.getToken()) return null;

  const list = (favorites as any[]) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Favourite</span>
        </nav>
        <h1 className="text-2xl font-bold mb-6">Favourite</h1>

        {isLoading ? (
          <div className="animate-pulse h-64 rounded-xl bg-secondary/30" />
        ) : list.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">No favourites yet.</p>
            <Link href="/products">
              <Button>Browse products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((fav: any) => (
              <div
                key={fav.id}
                className="rounded-xl border border-border bg-card overflow-hidden hover:bg-secondary/20 transition-colors"
              >
                <Link href={`/products/${fav.product_slug || fav.product_id}`} className="block">
                  <div className="aspect-square bg-secondary/30 p-4">
                    {fav.product_image ? (
                      <img
                        src={getImageSrc(fav.product_image)}
                        alt={fav.product_name || ''}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold line-clamp-2">{fav.product_name}</p>
                    {fav.product_price != null && (
                      <p className="text-primary font-bold mt-1">{formatCurrency(fav.product_price)}</p>
                    )}
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.preventDefault();
                      removeMutation.mutate(fav.product_id);
                    }}
                    disabled={removeMutation.isPending}
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
