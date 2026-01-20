'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Trash2,
  User,
  Phone,
  FileText,
  Check,
  X,
  Truck,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  List,
  Clock,
  Eye,
  Filter,
  MoreVertical,
  Calendar,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Order statuses
const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-500' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

// Order status colors (dark theme compatible)
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  shipped: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
  delivered: 'bg-green-500/20 text-green-500 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-500 border-red-500/30',
};

// Helper to format image URL
const formatImageUrl = (image: string | null | undefined): string | null => {
  if (!image) return null;
  if (image.startsWith('data:') || image.startsWith('http')) return image;
  if (image.startsWith('/9j/') || image.startsWith('iVBOR')) {
    const prefix = image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,';
    return prefix + image;
  }
  return image;
};

interface DirectOrderItem {
  productId?: number;
  variantId?: number;
  productName: string;
  productSku?: string;
  variantName?: string;
  quantity: number;
  unitPrice?: number;
}

export default function DirectOrdersPage() {
  const queryClient = useQueryClient();
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  
  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const pageSize = 10;
  
  // Form state
  const [items, setItems] = useState<DirectOrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [brandName, setBrandName] = useState('');
  const [brandId, setBrandId] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['direct-orders', currentPage, statusFilter],
    queryFn: () => api.getDirectOrders({ 
      page: currentPage, 
      page_size: pageSize,
      status: statusFilter || undefined 
    }),
    enabled: viewMode === 'list',
  });
  
  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });
  
  const orders = ordersData || [];
  
  // Filter orders by search query
  const filteredOrders = orders.filter((order: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(query) ||
      order.customer_info?.customer_name?.toLowerCase().includes(query) ||
      order.brand_name?.toLowerCase().includes(query)
    );
  });
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      api.updateDirectOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-orders'] });
      toast({ title: '✅ Status Updated', variant: 'success' });
    },
    onError: () => {
      toast({ title: '❌ Failed to update status', variant: 'destructive' });
    },
  });
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: () => {
      const orderItems = items.map(item => ({
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productName,
        product_sku: item.productSku,
        variant_name: item.variantName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));
      
      return api.createDirectOrder({
        items: orderItems,
        customer_info: customerInfo,
        brand_name: brandName,
        brand_id: brandId || undefined,
        tracking_number: trackingNumber || undefined,
        carrier: carrier || undefined,
        notes: notes || undefined,
        order_date: orderDate ? new Date(orderDate).toISOString() : undefined,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['direct-orders'] });
      toast({
        title: '🎉 Direct Order Created!',
        description: `Order ${result.order_number} has been created. Note: Inventory was NOT affected.`,
        variant: 'success',
      });
      clearForm();
      setViewMode('list');
    },
    onError: (error: any) => {
      toast({
        title: '❌ Order Failed',
        description: error.response?.data?.detail || 'Failed to create order',
        variant: 'destructive',
      });
    },
  });
  
  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => api.deleteDirectOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-orders'] });
      setSelectedOrder(null);
      toast({ title: 'Order deleted', variant: 'success' });
    },
  });
  
  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (productSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        // Use include_hidden=true to allow adding hidden products to orders
        const results = await api.searchProducts(productSearch, 10, true);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [productSearch]);
  
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const clearForm = () => {
    setItems([]);
    setCustomerInfo({ customer_name: '', phone: '', email: '', address: '' });
    setBrandName('');
    setBrandId(null);
    setTrackingNumber('');
    setCarrier('');
    setNotes('');
    setOrderDate(new Date().toISOString().split('T')[0]);
  };
  
  const handleAddProduct = (product: any) => {
    const newItem: DirectOrderItem = {
      productId: product.id,
      variantId: product.variant_id,
      productName: product.is_variant ? product.name.split(' - ')[0] : product.name,
      productSku: product.sku,
      variantName: product.variant_name,
      quantity: 1,
      unitPrice: product.price,
    };
    
    setItems([...items, newItem]);
    setProductSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
    toast({ title: 'Product added', variant: 'success' });
  };
  
  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, quantity);
    setItems(updated);
  };
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await api.getDirectOrder(orderId);
      setSelectedOrder(order);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Direct Orders
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'list' 
              ? 'Brand-shipped orders that bypass inventory' 
              : 'Create a new direct order (inventory NOT affected)'}
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'list' && !selectedOrder && (
            <Button onClick={() => setViewMode('create')}>
              <Plus className="w-4 h-4 mr-2" />
              New Direct Order
            </Button>
          )}
          {viewMode === 'create' && (
            <Button variant="outline" onClick={() => { setViewMode('list'); clearForm(); }}>
              <List className="w-4 h-4 mr-2" />
              View Orders
            </Button>
          )}
        </div>
      </div>
      
      {/* Important Note */}
      {viewMode === 'create' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-primary">Direct Orders - Brand Shipped</h4>
                <p className="text-sm text-muted-foreground">
                  These orders are shipped directly by brands and do NOT affect your inventory. 
                  Use this for drop-shipped or brand-fulfilled orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Order List View */}
      {viewMode === 'list' && !selectedOrder && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Direct Orders
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Status</option>
                  {ORDER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No Direct Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter ? 'Try different search or filter' : 'Create your first direct order'}
                </p>
                {!searchQuery && !statusFilter && (
                  <Button onClick={() => setViewMode('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Direct Order
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {filteredOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customer_info?.customer_name || 'Unknown'} 
                            {order.brand_name && <span className="ml-2 text-primary">• {order.brand_name}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
                        </div>
                        <select
                          value={order.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({ orderId: order.id, status: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium border cursor-pointer",
                            STATUS_COLORS[order.status] || 'bg-gray-100'
                          )}
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <div className="text-sm text-muted-foreground hidden md:flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.order_date).toLocaleDateString('en-IN')}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {filteredOrders.length >= pageSize && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={filteredOrders.length < pageSize}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Order Detail View */}
      {viewMode === 'list' && selectedOrder && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div>
                  <CardTitle>{selectedOrder.order_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedOrder.order_date).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    updateStatusMutation.mutate({ orderId: selectedOrder.id, status: e.target.value });
                    setSelectedOrder({ ...selectedOrder, status: e.target.value });
                  }}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium border cursor-pointer",
                    STATUS_COLORS[selectedOrder.status] || 'bg-gray-100'
                  )}
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this order?')) {
                      deleteOrderMutation.mutate(selectedOrder.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </h4>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="font-medium">{selectedOrder.customer_info?.customer_name || 'N/A'}</p>
                  {selectedOrder.customer_info?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer_info.phone}</p>
                  )}
                  {selectedOrder.customer_info?.address && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedOrder.customer_info.address}</p>
                  )}
                </div>
              </div>
              
              {/* Brand & Shipping Info */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Shipping Details
                </h4>
                <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                  {selectedOrder.brand_name && (
                    <p><span className="text-muted-foreground">Brand:</span> {selectedOrder.brand_name}</p>
                  )}
                  {selectedOrder.carrier && (
                    <p><span className="text-muted-foreground">Carrier:</span> {selectedOrder.carrier}</p>
                  )}
                  {selectedOrder.tracking_number && (
                    <p><span className="text-muted-foreground">Tracking:</span> {selectedOrder.tracking_number}</p>
                  )}
                  {!selectedOrder.brand_name && !selectedOrder.carrier && !selectedOrder.tracking_number && (
                    <p className="text-muted-foreground">No shipping details</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="border rounded-lg divide-y">
                {selectedOrder.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && <p className="text-sm text-muted-foreground">{item.variant_name}</p>}
                      {item.product_sku && <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Qty: {item.quantity}</p>
                      {item.unit_price && (
                        <p className="text-sm text-muted-foreground">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notes */}
            {selectedOrder.notes && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h4>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Create Order Form */}
      {viewMode === 'create' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Add Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Add Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Search */}
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search products by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                      className="pl-10 h-12"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((product: any, index: number) => (
                        <button
                          key={`${product.id}-${product.variant_id || 'base'}-${index}`}
                          onClick={() => handleAddProduct(product)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors border-b border-border last:border-b-0 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          </div>
                          <div className="text-right">
                            {product.price && <p className="font-semibold text-primary">₹{parseFloat(product.price).toLocaleString('en-IN')}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Added Items ({items.length})</h4>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/30">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.productName}</p>
                            {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                            {item.productSku && <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-center"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Customer & Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer & Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Customer Name</label>
                    <Input
                      value={customerInfo.customer_name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone</label>
                    <Input
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Order Date</label>
                    <Input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Address</label>
                  <Input
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="Delivery address"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Brand & Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Brand & Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Brand</label>
                    <select
                      value={brandId || ''}
                      onChange={(e) => {
                        const id = e.target.value ? parseInt(e.target.value) : null;
                        setBrandId(id);
                        const brand = brands?.find((b: any) => b.id === id);
                        setBrandName(brand?.name || '');
                      }}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select brand</option>
                      {brands?.map((brand: any) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Or Enter Brand Name</label>
                    <Input
                      value={brandName}
                      onChange={(e) => { setBrandName(e.target.value); setBrandId(null); }}
                      placeholder="Brand name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Carrier</label>
                    <Input
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="e.g., DTDC, BlueDart"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tracking Number</label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Tracking number"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No items added yet</p>
                      <p className="text-sm">Search and add products</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="truncate flex-1 mr-2">{item.productName}</span>
                            <span>x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Total Items</span>
                          <span>{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => createOrderMutation.mutate()}
                        disabled={createOrderMutation.isPending || items.length === 0}
                      >
                        {createOrderMutation.isPending ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Create Direct Order
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Inventory will NOT be affected
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
