'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Warehouse,
  Package,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Edit,
  History,
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
// WebSocket disabled - app works without real-time updates
// import { useRealtimeUpdates } from '@/hooks/useWebSocket';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; product: any }>({
    open: false,
    product: null,
  });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; productId: number | null }>({
    open: false,
    productId: null,
  });
  const [newQuantity, setNewQuantity] = useState('');
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

  // Fetch logs for history
  const { data: logs } = useQuery({
    queryKey: ['inventory-logs', historyDialog.productId],
    queryFn: () => api.getInventoryLogs(historyDialog.productId!, 20),
    enabled: !!historyDialog.productId,
  });

  // Real-time updates
  // WebSocket disabled
  // useRealtimeUpdates('inventory', () => {
  //   refetch();
  //   refetchStats();
  // });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      api.updateInventory(productId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast({ title: 'Inventory updated!', variant: 'success' });
      setEditDialog({ open: false, product: null });
    },
    onError: () => {
      toast({ title: 'Failed to update inventory', variant: 'destructive' });
    },
  });

  const handleUpdateQuantity = () => {
    if (editDialog.product && newQuantity !== '') {
      updateMutation.mutate({
        productId: editDialog.product.id,
        quantity: parseInt(newQuantity),
      });
    }
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
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts?.map((product: any) => (
                    <tr key={product.id}>
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
                              setEditDialog({ open: true, product });
                              setNewQuantity(String(product.inventory_quantity));
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryDialog({ open: true, productId: product.id })}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
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
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, product: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Quantity</DialogTitle>
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
            <Button variant="outline" onClick={() => setEditDialog({ open: false, product: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuantity} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog({ open, productId: null })}>
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

