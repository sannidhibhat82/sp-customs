'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, formatCurrency, getImageSrc } from '@/lib/utils';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial filters from URL params
  const urlBrand = searchParams.get('brand');
  const urlCategory = searchParams.get('category');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategory || 'all');
  const [brandFilter, setBrandFilter] = useState<string>(urlBrand || 'all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: any }>({
    open: false,
    product: null,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryFilter, brandFilter, stockFilter],
    queryFn: () =>
      api.getProducts({
        page,
        page_size: 20,
        search: search || undefined,
        category_id: categoryFilter !== 'all' ? Number(categoryFilter) : undefined,
        brand_id: brandFilter !== 'all' ? Number(brandFilter) : undefined,
        in_stock: stockFilter === 'in_stock' ? true : stockFilter === 'out_of_stock' ? false : undefined,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product deleted', variant: 'success' });
      setDeleteDialog({ open: false, product: null });
    },
    onError: () => {
      toast({ title: 'Failed to delete product', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog ({products?.total || 0} total)
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat: any) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((brand: any) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-secondary rounded-lg mb-4" />
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products?.items?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try adjusting your search or filters' : 'Start by adding your first product'}
            </p>
            {!search && (
              <Link href="/admin/products/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.items?.map((product: any, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="group hover:border-primary/50 transition-all overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                >
                  <div className="relative aspect-square bg-secondary">
                    {product.primary_image ? (
                      <img
                        src={getImageSrc(product.primary_image)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    {/* Status badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {!product.is_active && (
                        <span className="badge bg-red-500/80 text-white">Inactive</span>
                      )}
                      {product.is_featured && (
                        <span className="badge bg-primary/80 text-white">Featured</span>
                      )}
                      {product.is_new && (
                        <span className="badge bg-green-500/80 text-white">New</span>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        {product.price && (
                          <p className="font-bold text-lg">{formatCurrency(product.price)}</p>
                        )}
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        product.is_in_stock 
                          ? "bg-green-500/10 text-green-400" 
                          : "bg-red-500/10 text-red-400"
                      )}>
                        {product.is_in_stock ? `${product.inventory_quantity} in stock` : 'Out of stock'}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/products/${product.id}`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, product });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {products && products.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {products.total_pages}
              </span>
              <Button
                variant="outline"
                disabled={!products.has_next}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, product: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.product?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, product: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteDialog.product.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

