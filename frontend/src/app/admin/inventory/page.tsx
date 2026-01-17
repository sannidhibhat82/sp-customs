'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warehouse,
  Package,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Edit,
  History,
  ChevronDown,
  ChevronRight,
  Palette,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, formatDateTime } from '@/lib/utils';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; product: any; isVariant?: boolean }>({
    open: false,
    product: null,
    isVariant: false,
  });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; productId: number | null; isVariant: boolean; variantId: number | null }>({
    open: false,
    productId: null,
    isVariant: false,
    variantId: null,
  });
  const [newQuantity, setNewQuantity] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [productVariants, setProductVariants] = useState<Record<number, any[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Set<number>>(new Set());
  const [productsWithoutVariants, setProductsWithoutVariants] = useState<Set<number>>(new Set());
  const [variantCheckDone, setVariantCheckDone] = useState<Set<number>>(new Set());
  const PAGE_SIZE = 20;

  // Fetch products with inventory
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products-inventory', page, filter, search],
    queryFn: () => api.getProducts({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      in_stock: filter === 'in_stock' ? true : filter === 'out_of_stock' ? false : undefined,
    }),
  });

  // Fetch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => api.getInventoryStats(),
  });

  // Fetch logs for history (product or variant)
  const { data: logs } = useQuery({
    queryKey: ['inventory-logs', historyDialog.productId, historyDialog.isVariant, historyDialog.variantId],
    queryFn: () => historyDialog.isVariant && historyDialog.variantId
      ? api.getVariantInventoryLogs(historyDialog.variantId, 20)
      : api.getInventoryLogs(historyDialog.productId!, 20),
    enabled: historyDialog.isVariant ? !!historyDialog.variantId : !!historyDialog.productId,
  });

  // Pre-fetch variant info for visible products
  const checkProductVariants = useCallback(async (productIds: number[]) => {
    const uncheckedIds = productIds.filter(id => !variantCheckDone.has(id));
    if (uncheckedIds.length === 0) return;

    // Check each product for variants
    for (const productId of uncheckedIds) {
      try {
        const variants = await api.getProductVariants(productId);
        setProductVariants(prev => ({ ...prev, [productId]: variants }));
        if (!variants || variants.length === 0) {
          setProductsWithoutVariants(prev => new Set(prev).add(productId));
        }
      } catch {
        setProductsWithoutVariants(prev => new Set(prev).add(productId));
        setProductVariants(prev => ({ ...prev, [productId]: [] }));
      }
      setVariantCheckDone(prev => new Set(prev).add(productId));
    }
  }, [variantCheckDone]);

  // Check variants when products load
  useEffect(() => {
    if (products?.items?.length) {
      const productIds = products.items.map((p: any) => p.id);
      checkProductVariants(productIds);
    }
  }, [products?.items, checkProductVariants]);

  // Update mutation for products
  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      api.updateInventory(productId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast({ title: 'Inventory updated!', variant: 'success' });
      setEditDialog({ open: false, product: null, isVariant: false });
    },
    onError: () => {
      toast({ title: 'Failed to update inventory', variant: 'destructive' });
    },
  });

  // Update mutation for variants
  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) =>
      api.updateVariantInventory(variantId, quantity, 'set'),
    onSuccess: (_, variables) => {
      // Update local variants state
      setProductVariants(prev => {
        const updated = { ...prev };
        for (const productId in updated) {
          updated[productId] = updated[productId].map(v => 
            v.id === variables.variantId ? { ...v, inventory_quantity: variables.quantity } : v
          );
        }
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast({ title: 'Variant inventory updated!', variant: 'success' });
      setEditDialog({ open: false, product: null, isVariant: false });
    },
    onError: () => {
      toast({ title: 'Failed to update variant inventory', variant: 'destructive' });
    },
  });

  const handleUpdateQuantity = () => {
    if (editDialog.product && newQuantity !== '') {
      if (editDialog.isVariant) {
        updateVariantMutation.mutate({
          variantId: editDialog.product.id,
          quantity: parseInt(newQuantity),
        });
      } else {
        updateMutation.mutate({
          productId: editDialog.product.id,
          quantity: parseInt(newQuantity),
        });
      }
    }
  };

  // Toggle expand and fetch variants
  const toggleExpand = async (productId: number) => {
    // Don't expand if we know this product has no variants
    if (productsWithoutVariants.has(productId)) {
      return;
    }
    
    if (expandedProducts.has(productId)) {
      // Collapse
      setExpandedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } else {
      // Fetch variants if not already loaded
      if (!productVariants[productId]) {
        setLoadingVariants(prev => new Set(prev).add(productId));
        let hasVariantsResult = false;
        
        try {
          const variants = await api.getProductVariants(productId);
          setProductVariants(prev => ({ ...prev, [productId]: variants }));
          hasVariantsResult = variants && variants.length > 0;
          
          // If no variants, remember this
          if (!hasVariantsResult) {
            setProductsWithoutVariants(prev => new Set(prev).add(productId));
          }
        } catch (error) {
          // Product may not have variants
          setProductVariants(prev => ({ ...prev, [productId]: [] }));
          setProductsWithoutVariants(prev => new Set(prev).add(productId));
          hasVariantsResult = false;
        } finally {
          setLoadingVariants(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
        }
        
        // Expand only if has variants
        if (hasVariantsResult) {
          setExpandedProducts(prev => new Set(prev).add(productId));
        }
      } else {
        // Already loaded - just toggle if has variants
        if (productVariants[productId]?.length > 0) {
          setExpandedProducts(prev => new Set(prev).add(productId));
        }
      }
    }
  };
  
  // Check if product has variants (known)
  const hasVariants = (productId: number): boolean | null => {
    if (productsWithoutVariants.has(productId)) return false;
    if (productVariants[productId] !== undefined) {
      return productVariants[productId].length > 0;
    }
    // If we've checked this product but found nothing, return false
    if (variantCheckDone.has(productId)) return false;
    return null; // Unknown yet - still checking
  };

  // Check if variant check is in progress
  const isCheckingVariants = (productId: number): boolean => {
    return !variantCheckDone.has(productId);
  };

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'In Stock',
      value: stats?.in_stock || 0,
      icon: Warehouse,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Low Stock',
      value: stats?.low_stock || 0,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Out of Stock',
      value: stats?.out_of_stock || 0,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  // Filter products
  const filteredProducts = products?.items?.filter((p: any) => {
    if (filter === 'low_stock') {
      return p.inventory_quantity > 0 && p.inventory_quantity <= 5;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Monitor and manage stock levels
          </p>
        </div>
        <Link href="/admin/scanner">
          <Button>
            <Warehouse className="w-4 h-4 mr-2" />
            Open Scanner
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bgColor)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredProducts?.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Product / Variant</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts?.map((product: any) => (
                    <>
                      <tr key={product.id} className="hover:bg-secondary/30">
                        <td className="w-8 px-2">
                          {isCheckingVariants(product.id) ? (
                            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                          ) : hasVariants(product.id) ? (
                            <button
                              onClick={() => toggleExpand(product.id)}
                              className={cn(
                                "p-1 rounded hover:bg-secondary",
                                loadingVariants.has(product.id) && "opacity-50"
                              )}
                              title="Show variants"
                              disabled={loadingVariants.has(product.id)}
                            >
                              {loadingVariants.has(product.id) ? (
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              ) : expandedProducts.has(product.id) ? (
                                <ChevronDown className="w-4 h-4 text-primary" />
                              ) : (
                                <Layers className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6 h-6" /> 
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center overflow-hidden">
                              {product.primary_image ? (
                                <img
                                  src={`data:image/jpeg;base64,${product.primary_image}`}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.category?.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-sm">{product.sku}</td>
                        <td>
                          <span className={cn(
                            "text-lg font-bold",
                            product.inventory_quantity === 0 ? "text-red-400" :
                            product.inventory_quantity <= 5 ? "text-yellow-400" :
                            "text-green-400"
                          )}>
                            {product.inventory_quantity}
                          </span>
                        </td>
                        <td>
                          {product.inventory_quantity === 0 ? (
                            <span className="badge badge-danger">Out of Stock</span>
                          ) : product.inventory_quantity <= 5 ? (
                            <span className="badge badge-warning">Low Stock</span>
                          ) : (
                            <span className="badge badge-success">In Stock</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditDialog({ open: true, product, isVariant: false });
                                setNewQuantity(String(product.inventory_quantity));
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryDialog({ open: true, productId: product.id, isVariant: false, variantId: null })}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Variant Rows */}
                      <AnimatePresence>
                        {expandedProducts.has(product.id) && productVariants[product.id]?.length > 0 && (
                          productVariants[product.id].map((variant: any) => (
                            <motion.tr
                              key={`variant-${variant.id}`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-secondary/20 border-l-4 border-l-primary/30"
                            >
                              <td className="w-8 px-2"></td>
                              <td>
                                <div className="flex items-center gap-3 pl-4">
                                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden">
                                    {variant.primary_image ? (
                                      <img
                                        src={variant.primary_image.startsWith('data:') ? variant.primary_image : `data:image/jpeg;base64,${variant.primary_image}`}
                                        alt={variant.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Palette className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm flex items-center gap-2">
                                      <span className="text-primary">↳</span> {variant.name}
                                      {variant.is_default && (
                                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded">Default</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {Object.entries(variant.options || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="font-mono text-xs">{variant.sku || '-'}</td>
                              <td>
                                <span className={cn(
                                  "text-base font-bold",
                                  variant.inventory_quantity === 0 ? "text-red-400" :
                                  variant.inventory_quantity <= 5 ? "text-yellow-400" :
                                  "text-green-400"
                                )}>
                                  {variant.inventory_quantity}
                                </span>
                              </td>
                              <td>
                                {variant.inventory_quantity === 0 ? (
                                  <span className="badge badge-danger text-xs">Out</span>
                                ) : variant.inventory_quantity <= 5 ? (
                                  <span className="badge badge-warning text-xs">Low</span>
                                ) : (
                                  <span className="badge badge-success text-xs">In Stock</span>
                                )}
                              </td>
                              <td>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditDialog({ open: true, product: variant, isVariant: true });
                                      setNewQuantity(String(variant.inventory_quantity));
                                    }}
                                    title="Update Variant Quantity"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setHistoryDialog({ open: true, productId: null, isVariant: true, variantId: variant.id })}
                                    title="Inventory History"
                                  >
                                    <History className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {products && products.total > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, products.total)} of {products.total} items
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(products.total / PAGE_SIZE)) }, (_, i) => {
                      const totalPages = Math.ceil(products.total / PAGE_SIZE);
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(Math.ceil(products.total / PAGE_SIZE), p + 1))}
                    disabled={page >= Math.ceil(products.total / PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Quantity Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, product: null, isVariant: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {editDialog.isVariant ? 'Variant' : 'Product'} Quantity</DialogTitle>
            <DialogDescription>
              Adjust the stock quantity for {editDialog.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">New Quantity</label>
            <Input
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, product: null, isVariant: false })}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuantity} disabled={updateMutation.isPending || updateVariantMutation.isPending}>
              {(updateMutation.isPending || updateVariantMutation.isPending) ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog({ open, productId: null, isVariant: false, variantId: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inventory History</DialogTitle>
            <DialogDescription>
              Recent stock changes for this product
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {logs?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No history available</p>
            ) : (
              logs?.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                    log.quantity_change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium capitalize">{log.action.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.quantity_before} → {log.quantity_after}
                    </p>
                    {log.reason && (
                      <p className="text-sm text-muted-foreground">{log.reason}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

