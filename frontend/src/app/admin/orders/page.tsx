'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import {
  Package,
  Scan,
  Plus,
  Minus,
  Trash2,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Printer,
  Check,
  X,
  Smartphone,
  Copy,
  ExternalLink,
  Truck,
  CreditCard,
  Tag,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  Receipt,
  StickyNote,
  Search,
  List,
  Clock,
  Eye,
  AlertTriangle,
  Filter,
  MoreVertical,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useOrderStore, OrderItemData, ShippingInfoData } from '@/lib/store';
import { useStoreSettingsStore } from '@/lib/store';

// Indian States for dropdown
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

// Payment methods
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'prepaid', label: 'Prepaid' },
];

// Order statuses
const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-500' },
  { value: 'packed', label: 'Packed', color: 'bg-purple-500' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

// Order status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  processing: 'bg-blue-100 text-blue-800 border-blue-300',
  packed: 'bg-purple-100 text-purple-800 border-purple-300',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper to format image URL (handles base64 and regular URLs)
const formatImageUrl = (image: string | null | undefined): string | null => {
  if (!image) return null;
  // If already a data URL or regular URL, return as-is
  if (image.startsWith('data:') || image.startsWith('http')) return image;
  // If it's base64 without prefix, add it
  if (image.startsWith('/9j/') || image.startsWith('iVBOR')) {
    // JPEG starts with /9j/, PNG starts with iVBOR
    const prefix = image.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,';
    return prefix + image;
  }
  return image;
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { storeSettings } = useStoreSettingsStore();
  
  // View mode: 'list' for order list, 'create' for creating new order
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  
  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const pageSize = 10;
  
  // Order store
  const {
    items,
    shippingInfo,
    paymentInfo,
    notes,
    discountAmount,
    shippingCost,
    taxAmount,
    addItem,
    removeItem,
    updateItemQuantity,
    setShippingInfo,
    setPaymentInfo,
    setNotes,
    setDiscountAmount,
    setShippingCost,
    setTaxAmount,
    clearOrder,
    getSubtotal,
    getTotal,
  } = useOrderStore();
  
  // Local state
  const [activeStep, setActiveStep] = useState<'scan' | 'shipping' | 'review'>('scan');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    address: true,
    payment: true,
    notes: false,
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const mobileUrl = typeof window !== 'undefined' ? `${window.location.origin}/mobile/scanner` : '';
  
  // Fetch orders list with pagination
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders', currentPage, statusFilter],
    queryFn: () => api.getOrders({ 
      page: currentPage, 
      page_size: pageSize,
      status: statusFilter || undefined 
    }),
    enabled: viewMode === 'list',
  });
  
  const orders = ordersData || [];
  const totalOrders = orders.length;
  const totalPages = Math.ceil(totalOrders / pageSize) || 1;
  
  // Filter orders by search query
  const filteredOrders = orders.filter((order: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(query) ||
      order.shipping_info?.customer_name?.toLowerCase().includes(query) ||
      order.shipping_info?.phone?.includes(query)
    );
  });
  
  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      api.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: '✅ Status Updated', variant: 'success' });
    },
    onError: () => {
      toast({ title: '❌ Failed to update status', variant: 'destructive' });
    },
  });
  
  // Copy mobile URL
  const copyToClipboard = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied!', variant: 'success' });
  };
  
  // Auto-focus barcode input
  useEffect(() => {
    if (activeStep === 'scan' && barcodeInputRef.current && viewMode === 'create') {
      barcodeInputRef.current.focus();
    }
  }, [activeStep, viewMode]);
  
  // Scan product mutation
  const scanMutation = useMutation({
    mutationFn: (data: { barcode?: string; product_id?: number }) => 
      api.scanProductForOrder(data),
    onSuccess: (result) => {
      if (result.available_quantity <= 0) {
        toast({
          title: '⚠️ Out of Stock',
          description: `${result.product_name} is currently out of stock`,
          variant: 'destructive',
        });
        return;
      }
      
      const existingItem = items.find(
        i => i.productId === result.product_id && i.variantId === result.variant_id
      );
      if (existingItem && existingItem.quantity >= result.available_quantity) {
        toast({
          title: '⚠️ Stock Limit Reached',
          description: `Only ${result.available_quantity} units available`,
          variant: 'destructive',
        });
        return;
      }
      
      const newItem: OrderItemData = {
        productId: result.product_id,
        variantId: result.variant_id,
        productName: result.product_name,
        productSku: result.product_sku,
        productBarcode: result.product_barcode,
        variantName: result.variant_name,
        variantOptions: result.variant_options || {},
        unitPrice: parseFloat(result.unit_price) || 0,
        quantity: 1,
        discount: 0,
        productImage: result.product_image,
        availableQuantity: result.available_quantity,
      };
      
      addItem(newItem);
      setManualBarcode('');
      
      toast({
        title: '✅ Product Added',
        description: `${result.product_name}${result.variant_name ? ` - ${result.variant_name}` : ''}`,
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Scan Failed',
        description: error.response?.data?.detail || 'Product not found',
        variant: 'destructive',
      });
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
        product_barcode: item.productBarcode,
        variant_name: item.variantName,
        variant_options: item.variantOptions,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount,
        product_image: item.productImage,
      }));
      
      return api.createOrder({
        items: orderItems,
        shipping_info: shippingInfo,
        payment_info: paymentInfo,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        customer_notes: notes,
      });
    },
    onSuccess: (result) => {
      setCreatedOrder(result);
      setShowInvoice(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: '🎉 Order Created!',
        description: `Order ${result.order_number} has been created successfully.`,
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Order Failed',
        description: error.response?.data?.detail || 'Failed to create order',
        variant: 'destructive',
      });
    },
  });
  
  const handleScan = useCallback((barcode: string) => {
    if (!barcode.trim() || isScanning) return;
    setIsScanning(true);
    scanMutation.mutate({ barcode: barcode.trim() }, {
      onSettled: () => setIsScanning(false),
    });
  }, [scanMutation, isScanning]);
  
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
    }
  };

  // Handle adding product from search results
  const handleAddProduct = useCallback((product: any) => {
    if (!product) return;
    
    // Check stock
    if (product.quantity <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock`,
        variant: 'destructive',
      });
      return;
    }
    
    // Check if already in cart
    const existingItem = items.find(i => i.productId === product.id);
    if (existingItem && existingItem.quantity >= product.quantity) {
      toast({
        title: 'Stock Limit Reached',
        description: `Only ${product.quantity} units available`,
        variant: 'destructive',
      });
      return;
    }
    
    const newItem: OrderItemData = {
      productId: product.id,
      variantId: undefined,
      productName: product.name,
      productSku: product.sku,
      productBarcode: product.barcode,
      variantName: undefined,
      variantOptions: {},
      unitPrice: parseFloat(product.price) || 0,
      quantity: 1,
      discount: 0,
      productImage: product.primary_image,
      availableQuantity: product.quantity || 0,
    };
    
    addItem(newItem);
    
    toast({
      title: '✅ Product Added',
      description: product.name,
      variant: 'success',
    });
  }, [items, addItem]);
  
  const subtotal = getSubtotal();
  const total = getTotal();
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const isShippingValid = () => {
    return (
      shippingInfo.customer_name.trim() !== '' &&
      shippingInfo.phone.trim() !== '' &&
      shippingInfo.address_line1.trim() !== '' &&
      shippingInfo.city.trim() !== '' &&
      shippingInfo.state.trim() !== '' &&
      shippingInfo.postal_code.trim() !== ''
    );
  };
  
  // Print invoice
  const handlePrintInvoice = () => {
    const order = createdOrder || selectedOrder;
    if (!order) return;
    
    const shipping = order.shipping_info || {};
    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) return;
    
    const invoiceHTML = generateInvoiceHTML(order, shipping, storeSettings);
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  
  // Print label
  const handlePrintLabel = () => {
    const order = createdOrder || selectedOrder;
    if (!order) return;
    
    const shipping = order.shipping_info || {};
    const printWindow = window.open('', '', 'width=400,height=500');
    if (!printWindow) return;
    
    const labelHTML = generateLabelHTML(order, shipping, storeSettings);
    printWindow.document.write(labelHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download Invoice as PDF file
  const handleDownloadInvoice = async () => {
    const order = createdOrder || selectedOrder;
    if (!order) return;
    
    const shipping = order.shipping_info || {};
    const invoiceHTML = generateInvoiceHTML(order, shipping, storeSettings);
    
    // Dynamically import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = invoiceHTML;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    const element = (container.querySelector('.invoice-container') || container) as HTMLElement;
    
    const opt = {
      margin: 10,
      filename: `Invoice-${order.order_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      toast({
        title: '✅ Invoice Downloaded',
        description: `Invoice-${order.order_number}.pdf saved`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: '❌ Download Failed',
        description: 'Could not generate PDF',
        variant: 'destructive',
      });
    } finally {
      document.body.removeChild(container);
    }
  };

  // Download Label as PDF file
  const handleDownloadLabel = async () => {
    const order = createdOrder || selectedOrder;
    if (!order) return;
    
    const shipping = order.shipping_info || {};
    const labelHTML = generateLabelHTML(order, shipping, storeSettings);
    
    // Dynamically import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = labelHTML;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    const element = (container.querySelector('.label') || container) as HTMLElement;
    
    const opt = {
      margin: 5,
      filename: `Label-${order.order_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: [100, 150] as [number, number], orientation: 'portrait' as const }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      toast({
        title: '✅ Label Downloaded',
        description: `Label-${order.order_number}.pdf saved`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: '❌ Download Failed',
        description: 'Could not generate PDF',
        variant: 'destructive',
      });
    } finally {
      document.body.removeChild(container);
    }
  };
  
  const handleNewOrder = () => {
    clearOrder();
    setCreatedOrder(null);
    setShowInvoice(false);
    setActiveStep('scan');
    setViewMode('create');
  };
  
  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await api.getOrder(orderId);
      setSelectedOrder(order);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' });
    }
  };
  
  const steps = [
    { id: 'scan', label: 'Add Products', icon: Package },
    { id: 'shipping', label: 'Shipping Details', icon: Truck },
    { id: 'review', label: 'Review & Create', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Orders
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'list' ? 'Manage and track orders' : 'Create a new shipping order'}
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'list' && !selectedOrder && (
            <Button onClick={handleNewOrder}>
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          )}
          {viewMode === 'create' && !showInvoice && (
            <>
              <Button variant="outline" onClick={() => { setViewMode('list'); clearOrder(); }}>
                <List className="w-4 h-4 mr-2" />
                View Orders
              </Button>
              {items.length > 0 && (
                <Button variant="outline" onClick={() => { clearOrder(); setActiveStep('scan'); }}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Order
                </Button>
              )}
            </>
          )}
          {showInvoice && (
            <Button variant="outline" onClick={() => { setViewMode('list'); clearOrder(); setShowInvoice(false); setCreatedOrder(null); }}>
              <List className="w-4 h-4 mr-2" />
              View Orders
            </Button>
          )}
        </div>
      </div>
      
      {/* Order List View */}
      {viewMode === 'list' && !selectedOrder && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Recent Orders
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                {/* Status Filter */}
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
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter ? 'Try different search or filter' : 'Create your first order'}
                </p>
                {!searchQuery && !statusFilter && (
                  <Button onClick={handleNewOrder}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
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
                          <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_info?.customer_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold">{formatCurrency(parseFloat(order.total))}</p>
                          <p className="text-xs text-muted-foreground">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
                        </div>
                        {/* Status Dropdown */}
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
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
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
        <OrderDetailView
          order={selectedOrder}
          storeSettings={storeSettings}
          onBack={() => setSelectedOrder(null)}
          onPrintInvoice={handlePrintInvoice}
          onPrintLabel={handlePrintLabel}
          onDownloadInvoice={handleDownloadInvoice}
          onDownloadLabel={handleDownloadLabel}
          onStatusChange={(status: string) => {
            updateStatusMutation.mutate({ orderId: selectedOrder.id, status });
            setSelectedOrder({ ...selectedOrder, status });
          }}
        />
      )}
      
      {/* Invoice Preview (after creating order) */}
      {showInvoice && createdOrder && (
        <InvoicePreview
          order={createdOrder}
          storeSettings={storeSettings}
          onPrintInvoice={handlePrintInvoice}
          onPrintLabel={handlePrintLabel}
          onDownloadInvoice={handleDownloadInvoice}
          onDownloadLabel={handleDownloadLabel}
          onNewOrder={handleNewOrder}
        />
      )}
      
      {viewMode === 'create' && !showInvoice && (
        <>
          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setActiveStep(step.id as any)}
                  disabled={step.id === 'shipping' && items.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80",
                    step.id === 'shipping' && items.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && <ChevronRight className="w-5 h-5 text-muted-foreground mx-2" />}
              </div>
            ))}
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AnimatePresence mode="wait">
                {activeStep === 'scan' && (
                  <ScanProductsStep
                    barcodeInputRef={barcodeInputRef}
                    manualBarcode={manualBarcode}
                    setManualBarcode={setManualBarcode}
                    handleBarcodeSubmit={handleBarcodeSubmit}
                    isScanning={isScanning}
                    showMobileQR={showMobileQR}
                    setShowMobileQR={setShowMobileQR}
                    mobileUrl={mobileUrl}
                    copyToClipboard={copyToClipboard}
                    copied={copied}
                    items={items}
                    updateItemQuantity={updateItemQuantity}
                    removeItem={removeItem}
                    setActiveStep={setActiveStep}
                    scanMutation={scanMutation}
                    onAddProduct={handleAddProduct}
                  />
                )}
                {activeStep === 'shipping' && (
                  <ShippingStep
                    shippingInfo={shippingInfo}
                    paymentInfo={paymentInfo}
                    notes={notes}
                    onShippingChange={setShippingInfo}
                    onPaymentChange={setPaymentInfo}
                    onNotesChange={setNotes}
                    expandedSections={expandedSections}
                    onToggleSection={toggleSection}
                    setActiveStep={setActiveStep}
                    isShippingValid={isShippingValid}
                  />
                )}
                {activeStep === 'review' && (
                  <ReviewStep
                    items={items}
                    shippingInfo={shippingInfo}
                    paymentInfo={paymentInfo}
                    setActiveStep={setActiveStep}
                    createOrderMutation={createOrderMutation}
                  />
                )}
              </AnimatePresence>
            </div>
            
            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No items added yet</p>
                        <p className="text-sm">Scan products to add them</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Items ({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Discount"
                            value={discountAmount || ''}
                            onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Shipping"
                            value={shippingCost || ''}
                            onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="Tax"
                            value={taxAmount || ''}
                            onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="border-t pt-4">
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Generate Professional Invoice HTML
function generateInvoiceHTML(order: any, shipping: any, storeSettings: any) {
  const items = order.items || [];
  const subtotal = parseFloat(order.subtotal) || 0;
  const discount = parseFloat(order.discount_amount) || 0;
  const shippingCost = parseFloat(order.shipping_cost) || 0;
  const tax = parseFloat(order.tax_amount) || 0;
  const total = parseFloat(order.total) || 0;
  const paymentMethod = PAYMENT_METHODS.find(m => m.value === order.payment_info?.method)?.label || 'Cash';
  
  // SVG Logo
  const logoSvg = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1696 608" width="100" height="36"><style>.s0 { fill: #000 }</style><path class="s0" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1z"/><path class="s0" d="m998 217c0 0 39.82 3.04 33 38-6.82 34.96-2 12-2 12 0 0-58.73 228.4 229 268 59.19 8.15 240.25-1.42 258-1 8.17 0.19 82-108 82-108l-327-2c0 0-97.87 0.94-113-87-0.61-3.54 17.96-49.76 18-52 1.1-60.99-19.63-105.66-56-139-36.37-33.34-121.64-41.04-131-42-9.36-0.96-320 1-320 1l-87 111z"/><path class="s0" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186z"/><path class="s0" d="m535 217l85-112h-405c0 0-142.41 3.17-147 123-4.59 119.83 104.21 128.78 132 133 27.79 4.22 270 1 270 1 0 0 32.48 1.56 33 28 0.52 26.44-30 34-30 34h-335l-85 110 415 1c0 0 161.66 1.66 163-134 1.34-135.66-144-125-144-125h-260c0 0-36.59-4.44-31-29 5.59-24.56 14.63-25.45 28-29 13.37-3.55 311-1 311-1zm84 285v33h131v-110l272-2c0 0-18.24-43.77-21-56-2.76-12.23-5.66-27.97-6-47-0.12-6.56-10.79-4.38-11-4-0.32 0.58-65-1-65-1l-281 1c0 0 55.21 100.77-19 186zm619-281l277-4 83-112-358 1c0 0-64.61 5.61-95 26-8.18 5.49-1.51 6.99 4.87 10.26 13.68 7.03 49.33 59.46 49.13 93.74q-0.01 1.62 0.1 2.99c0.13 1.75 38.9-17.99 38.9-17.99z"/></svg>`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${order.order_number}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: white;
      color: #000;
      font-size: 14px;
      line-height: 1.5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 25px;
      border-bottom: 3px solid #000;
      margin-bottom: 25px;
    }
    .logo-section {
      display: flex;
      flex-direction: column;
    }
    .logo {
      margin-bottom: 10px;
    }
    .company-details {
      font-size: 11px;
      color: #333;
      line-height: 1.6;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: -2px;
      margin-bottom: 12px;
    }
    .invoice-meta {
      font-size: 12px;
      color: #333;
    }
    .invoice-meta div {
      margin-bottom: 3px;
    }
    .invoice-meta strong {
      display: inline-block;
      width: 45px;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 25px;
    }
    .info-box h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #000;
    }
    .info-box p {
      font-size: 12px;
      color: #333;
      line-height: 1.6;
      margin-bottom: 2px;
    }
    .info-box .name {
      font-weight: 600;
      font-size: 14px;
      color: #000;
      margin-bottom: 5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead {
      background: #000;
      color: white;
    }
    .items-table th {
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .items-table th:last-child { text-align: right; }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    .items-table tr:last-child td { border-bottom: 2px solid #000; }
    .item-name {
      font-weight: 600;
      color: #000;
    }
    .item-variant {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }
    .item-sku {
      font-size: 9px;
      color: #999;
      font-family: monospace;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals-section {
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 250px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      border-bottom: 1px solid #eee;
    }
    .total-row.final {
      border-top: 2px solid #000;
      border-bottom: none;
      margin-top: 8px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 700;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .footer-row strong {
      font-weight: 600;
    }
    .thank-you {
      text-align: center;
      margin-top: 25px;
      font-size: 13px;
      font-weight: 500;
    }
    @media print {
      body { background: white; }
      .invoice-container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-section">
        <div class="logo">${logoSvg}</div>
        <div class="company-details">
          ${storeSettings.store_address || 'Bangalore, Karnataka, India'}<br>
          ${storeSettings.store_phone || '+91 98765 43210'}<br>
          ${storeSettings.store_email || 'contact@spcustoms.com'}
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <div><strong>No:</strong> ${order.order_number}</div>
          <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-box">
        <h4>Billed To</h4>
        <p class="name">${shipping.customer_name || 'N/A'}</p>
        <p>${shipping.address_line1 || ''}</p>
        ${shipping.address_line2 ? `<p>${shipping.address_line2}</p>` : ''}
        <p>${shipping.city || ''}, ${shipping.state || ''}</p>
        <p>${shipping.postal_code || ''}, ${shipping.country || 'India'}</p>
        <p>${shipping.phone || ''}</p>
        ${shipping.email ? `<p>${shipping.email}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>Ship To</h4>
        <p class="name">${shipping.customer_name || 'N/A'}</p>
        <p>${shipping.address_line1 || ''}</p>
        ${shipping.address_line2 ? `<p>${shipping.address_line2}</p>` : ''}
        <p>${shipping.city || ''}, ${shipping.state || ''}</p>
        <p>${shipping.postal_code || ''}</p>
        ${shipping.landmark ? `<p>Near: ${shipping.landmark}</p>` : ''}
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%">Item</th>
          <th class="text-center">Quantity</th>
          <th class="text-right">Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item: any) => `
          <tr>
            <td>
              <div class="item-name">${item.product_name}</div>
              ${item.variant_name ? `<div class="item-variant">${item.variant_name}</div>` : ''}
              <div class="item-sku">SKU: ${item.product_sku}</div>
            </td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">₹${parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
            <td class="text-right"><strong>₹${parseFloat(item.total).toLocaleString('en-IN')}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal</span>
          <span>₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${discount > 0 ? `
          <div class="total-row">
            <span>Discount</span>
            <span>-₹${discount.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        ${shippingCost > 0 ? `
          <div class="total-row">
            <span>Shipping</span>
            <span>₹${shippingCost.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        ${tax > 0 ? `
          <div class="total-row">
            <span>Tax</span>
            <span>₹${tax.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="total-row final">
          <span>Total</span>
          <span>₹${total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-row">
        <span><strong>Payment Method:</strong> ${paymentMethod}</span>
      </div>
      <div class="footer-row">
        <span><strong>Note:</strong> Thank you for choosing us!</span>
      </div>
    </div>
    
    <div class="thank-you">
      Thank you for your business!
    </div>
  </div>
</body>
</html>`;
}

// Generate Label HTML
function generateLabelHTML(order: any, shipping: any, storeSettings: any) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Shipping Label - ${order.order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
    .label { border: 3px dashed #3b82f6; padding: 25px; max-width: 350px; margin: 0 auto; border-radius: 15px; }
    .section { text-align: center; margin-bottom: 20px; }
    .divider { border-top: 2px solid #3b82f6; margin: 20px 0; }
    .title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 8px; }
    .name { font-size: 18px; font-weight: bold; color: #1e293b; }
    .phone { font-weight: 600; color: #3b82f6; font-size: 16px; }
    .address { margin-top: 8px; color: #475569; line-height: 1.5; }
    .order-num { font-family: monospace; font-size: 16px; font-weight: bold; background: #f1f5f9; padding: 8px 15px; border-radius: 8px; display: inline-block; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="section">
      <div class="title">📤 From</div>
      <div class="name">${storeSettings.store_name || 'SP Customs'}</div>
      <div class="address">${storeSettings.store_address || 'Bangalore, Karnataka'}</div>
      <div class="phone">${storeSettings.store_phone || '+91 98765 43210'}</div>
    </div>
    <div class="divider"></div>
    <div class="section">
      <div class="title">📥 To</div>
      <div class="name">${shipping.customer_name || 'N/A'}</div>
      <div class="phone">${shipping.phone || ''}</div>
      <div class="address">
        ${shipping.address_line1 || ''}<br>
        ${shipping.address_line2 ? shipping.address_line2 + '<br>' : ''}
        <strong>${shipping.city || ''}, ${shipping.state || ''} - ${shipping.postal_code || ''}</strong>
        ${shipping.landmark ? '<br>Near: ' + shipping.landmark : ''}
      </div>
    </div>
    <div class="divider"></div>
    <div class="section">
      <div class="title">📦 Order</div>
      <div class="order-num">${order.order_number}</div>
      <div class="address">${new Date(order.created_at).toLocaleDateString('en-IN')}</div>
    </div>
  </div>
</body>
</html>`;
}

// Scan Products Step Component
function ScanProductsStep({
  barcodeInputRef,
  manualBarcode,
  setManualBarcode,
  handleBarcodeSubmit,
  isScanning,
  showMobileQR,
  setShowMobileQR,
  mobileUrl,
  copyToClipboard,
  copied,
  items,
  updateItemQuantity,
  removeItem,
  setActiveStep,
  scanMutation,
  onAddProduct,
}: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search products as user types
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await api.searchProducts(searchQuery, 10);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

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

  const handleSelectProduct = (product: any) => {
    onAddProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Add Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Search */}
          <div ref={searchRef} className="relative">
            <label className="text-sm font-medium mb-2 block">Search Products</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                className="pl-10 h-12 text-lg"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {searchResults.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 text-left"
                  >
                    {product.primary_image ? (
                      <img 
                        src={formatImageUrl(product.primary_image) || ''} 
                        alt={product.name} 
                        className="w-12 h-12 rounded object-cover" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.quantity || 0} available
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                      {product.quantity <= 0 && (
                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">Out of Stock</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                No products found for "{searchQuery}"
              </div>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-sm text-muted-foreground bg-white">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Scanner Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Scan Barcode / Enter SKU</label>
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan barcode or enter SKU..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <Button type="submit" disabled={isScanning || !manualBarcode.trim()} className="h-12 px-6">
                  {isScanning ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMobileQR(!showMobileQR)}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile Scanner
                </Button>
              </div>
            </form>
          </div>
          
          {/* Mobile QR */}
          {showMobileQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border rounded-lg p-6 bg-secondary/50 text-center"
            >
              <p className="text-sm text-muted-foreground mb-4">
                Scan with your phone to use camera scanner
              </p>
              <div className="bg-white p-4 inline-block rounded-lg">
                <QRCode value={mobileUrl} size={150} />
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <code className="text-xs bg-secondary px-2 py-1 rounded">{mobileUrl}</code>
                <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Cart Items */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart ({items.length} item{items.length !== 1 ? 's' : ''})
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.map((item: OrderItemData) => (
                  <div key={`${item.productId}-${item.variantId || 'base'}`} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/30">
                    {formatImageUrl(item.productImage) && (
                      <img src={formatImageUrl(item.productImage) || ''} alt="" className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                      <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.unitPrice)}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.productId, Math.max(1, item.quantity - 1), item.variantId)}
                        className="w-7 h-7 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.productId, Math.min(item.availableQuantity, item.quantity + 1), item.variantId)}
                        disabled={item.quantity >= item.availableQuantity}
                        className="w-7 h-7 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setActiveStep('shipping')}>
                  Continue to Shipping
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Shipping Step Component
function ShippingStep({
  shippingInfo,
  paymentInfo,
  notes,
  onShippingChange,
  onPaymentChange,
  onNotesChange,
  expandedSections,
  onToggleSection,
  setActiveStep,
  isShippingValid,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <button
              onClick={() => onToggleSection('customer')}
              className="flex items-center justify-between w-full text-left font-semibold"
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </span>
              {expandedSections.customer ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.customer && (
              <div className="grid md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={shippingInfo.customer_name}
                    onChange={(e) => onShippingChange({ customer_name: e.target.value })}
                    placeholder="Customer name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    value={shippingInfo.phone}
                    onChange={(e) => onShippingChange({ phone: e.target.value })}
                    placeholder="Phone number"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => onShippingChange({ email: e.target.value })}
                    placeholder="Email address"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Address */}
          <div className="space-y-4 border-t pt-4">
            <button
              onClick={() => onToggleSection('address')}
              className="flex items-center justify-between w-full text-left font-semibold"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </span>
              {expandedSections.address ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.address && (
              <div className="grid md:grid-cols-2 gap-4 pl-6">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Address Line 1 *</label>
                  <Input
                    value={shippingInfo.address_line1}
                    onChange={(e) => onShippingChange({ address_line1: e.target.value })}
                    placeholder="House no, Street address"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Address Line 2</label>
                  <Input
                    value={shippingInfo.address_line2}
                    onChange={(e) => onShippingChange({ address_line2: e.target.value })}
                    placeholder="Apartment, suite, etc."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City *</label>
                  <Input
                    value={shippingInfo.city}
                    onChange={(e) => onShippingChange({ city: e.target.value })}
                    placeholder="City"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">State *</label>
                  <select
                    value={shippingInfo.state}
                    onChange={(e) => onShippingChange({ state: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Postal Code *</label>
                  <Input
                    value={shippingInfo.postal_code}
                    onChange={(e) => onShippingChange({ postal_code: e.target.value })}
                    placeholder="PIN Code"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Landmark</label>
                  <Input
                    value={shippingInfo.landmark}
                    onChange={(e) => onShippingChange({ landmark: e.target.value })}
                    placeholder="Near landmark"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Delivery Instructions</label>
                  <Input
                    value={shippingInfo.delivery_instructions}
                    onChange={(e) => onShippingChange({ delivery_instructions: e.target.value })}
                    placeholder="Special instructions for delivery"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Payment */}
          <div className="space-y-4 border-t pt-4">
            <button
              onClick={() => onToggleSection('payment')}
              className="flex items-center justify-between w-full text-left font-semibold"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </span>
              {expandedSections.payment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.payment && (
              <div className="pl-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.value}
                      onClick={() => onPaymentChange({ method: method.value })}
                      className={cn(
                        "p-3 rounded-lg border text-sm font-medium transition-all",
                        paymentInfo.method === method.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-primary/50"
                      )}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Notes */}
          <div className="space-y-4 border-t pt-4">
            <button
              onClick={() => onToggleSection('notes')}
              className="flex items-center justify-between w-full text-left font-semibold"
            >
              <span className="flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Order Notes
              </span>
              {expandedSections.notes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.notes && (
              <div className="pl-6">
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add any notes about this order..."
                  rows={3}
                  className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveStep('scan')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setActiveStep('review')} disabled={!isShippingValid()}>
              Review Order
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Review Step Component
function ReviewStep({
  items,
  shippingInfo,
  paymentInfo,
  setActiveStep,
  createOrderMutation,
}: any) {
  const { discountAmount, shippingCost, taxAmount, getSubtotal, getTotal } = useOrderStore();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Review Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items Review */}
          <div className="space-y-3">
            <h4 className="font-semibold">Order Items</h4>
            <div className="border rounded-lg divide-y">
              {items.map((item: OrderItemData) => (
                <div key={`${item.productId}-${item.variantId || 'base'}`} className="flex justify-between items-center p-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Shipping Review */}
          <div className="space-y-3">
            <h4 className="font-semibold">Shipping To</h4>
            <div className="border rounded-lg p-4 bg-secondary/30">
              <p className="font-medium">{shippingInfo.customer_name}</p>
              <p className="text-sm">{shippingInfo.phone}</p>
              {shippingInfo.email && <p className="text-sm">{shippingInfo.email}</p>}
              <p className="text-sm mt-2">
                {shippingInfo.address_line1}
                {shippingInfo.address_line2 && `, ${shippingInfo.address_line2}`}
              </p>
              <p className="text-sm">{shippingInfo.city}, {shippingInfo.state} - {shippingInfo.postal_code}</p>
              {shippingInfo.landmark && <p className="text-sm text-muted-foreground">Near: {shippingInfo.landmark}</p>}
            </div>
          </div>
          
          {/* Payment Review */}
          <div className="space-y-3">
            <h4 className="font-semibold">Payment</h4>
            <div className="border rounded-lg p-4 bg-secondary/30">
              <p>{PAYMENT_METHODS.find(m => m.value === paymentInfo.method)?.label || 'Cash on Delivery'}</p>
            </div>
          </div>
          
          {/* Totals */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(getTotal())}</span>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveStep('shipping')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {createOrderMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Create Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Order Detail View Component
function OrderDetailView({
  order,
  storeSettings,
  onBack,
  onPrintInvoice,
  onPrintLabel,
  onDownloadInvoice,
  onDownloadLabel,
  onStatusChange,
}: any) {
  const shipping = order.shipping_info || {};
  const items = order.items || [];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <CardTitle className="text-xl">{order.order_number}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={order.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={cn(
                  "px-3 py-2 rounded-full text-sm font-medium border cursor-pointer",
                  STATUS_COLORS[order.status] || 'bg-gray-100'
                )}
              >
                {ORDER_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {/* Actions Dropdown */}
              <div className="relative group">
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Actions
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Print</span>
                  </div>
                  <button
                    onClick={onPrintInvoice}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-gray-500" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={onPrintLabel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-gray-500" />
                    <span>Print Label</span>
                  </button>
                  <div className="px-3 py-2 border-t border-b bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Download</span>
                  </div>
                  <button
                    onClick={onDownloadInvoice}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                    <span>Download Invoice</span>
                  </button>
                  <button
                    onClick={onDownloadLabel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 rounded-b-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                    <span>Download Label</span>
                  </button>
                </div>
              </div>
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
              <div className="p-4 rounded-lg bg-secondary/50 space-y-1">
                <p className="font-medium">{shipping.customer_name || 'N/A'}</p>
                <p className="text-sm flex items-center gap-2">
                  <Phone className="w-3 h-3" /> {shipping.phone || 'N/A'}
                </p>
                {shipping.email && (
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {shipping.email}
                  </p>
                )}
              </div>
            </div>
            
            {/* Delivery Address */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </h4>
              <div className="p-4 rounded-lg bg-secondary/50 space-y-1">
                <p>{shipping.address_line1 || ''}</p>
                {shipping.address_line2 && <p>{shipping.address_line2}</p>}
                <p>{shipping.city}, {shipping.state} - {shipping.postal_code}</p>
                {shipping.landmark && <p className="text-sm text-muted-foreground">Near: {shipping.landmark}</p>}
              </div>
            </div>
          </div>
          
          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Items ({items.length})
            </h4>
            <div className="border rounded-lg divide-y">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4">
                  {formatImageUrl(item.product_image) && (
                    <img src={formatImageUrl(item.product_image) || ''} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && <p className="text-sm text-muted-foreground">{item.variant_name}</p>}
                    <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(parseFloat(item.total))}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(parseFloat(item.unit_price))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 p-4 rounded-lg bg-secondary/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(parseFloat(order.subtotal))}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(parseFloat(order.discount_amount))}</span>
                </div>
              )}
              {parseFloat(order.shipping_cost) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(parseFloat(order.shipping_cost))}</span>
                </div>
              )}
              {parseFloat(order.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(parseFloat(order.tax_amount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(parseFloat(order.total))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Invoice Preview Component (After Order Created)
function InvoicePreview({
  order,
  storeSettings,
  onPrintInvoice,
  onPrintLabel,
  onDownloadInvoice,
  onDownloadLabel,
  onNewOrder,
}: any) {
  const shipping = order.shipping_info || {};
  const items = order.items || [];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Order Created Successfully!</h2>
            <p className="opacity-90">Order #{order.order_number}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Actions Dropdown */}
          <div className="relative group">
            <Button variant="secondary" className="gap-2">
              <MoreVertical className="w-4 h-4" />
              Actions
              <ChevronDown className="w-3 h-3" />
            </Button>
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Print</span>
              </div>
              <button
                onClick={onPrintInvoice}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={onPrintLabel}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4 text-gray-500" />
                <span>Print Label</span>
              </button>
              <div className="px-3 py-2 border-t border-b bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Download</span>
              </div>
              <button
                onClick={onDownloadInvoice}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 text-gray-500" />
                <span>Download Invoice</span>
              </button>
              <button
                onClick={onDownloadLabel}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg transition-colors"
              >
                <Download className="w-4 h-4 text-gray-500" />
                <span>Download Label</span>
              </button>
            </div>
          </div>
          <Button onClick={onNewOrder} className="bg-white text-green-600 hover:bg-green-50">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>
      
      {/* Invoice Preview Card */}
      <Card className="overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 text-white p-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-blue-800 font-bold text-2xl shadow-lg">
                SP
              </div>
              <div>
                <h2 className="text-2xl font-bold">{storeSettings.store_name || 'SP Customs'}</h2>
                <p className="text-blue-100 text-sm">{storeSettings.store_address || 'Bangalore, Karnataka, India'}</p>
                <p className="text-blue-100 text-sm">{storeSettings.store_phone || '+91 98765 43210'}</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-bold tracking-wider">INVOICE</h3>
              <p className="bg-white/20 px-4 py-1 rounded-full text-sm mt-2 inline-block">
                {order.order_number}
              </p>
              <p className="text-blue-100 text-sm mt-2">
                {new Date(order.created_at).toLocaleDateString('en-IN', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-8">
          {/* Bill To / Ship To */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-l-4 border-blue-500">
              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">📋 Bill To</h4>
              <p className="font-semibold text-lg">{shipping.customer_name || 'N/A'}</p>
              <p className="text-slate-600">📱 {shipping.phone || 'N/A'}</p>
              {shipping.email && <p className="text-slate-600">✉️ {shipping.email}</p>}
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-l-4 border-blue-500">
              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">📦 Ship To</h4>
              <p className="font-semibold text-lg">{shipping.customer_name || 'N/A'}</p>
              <p className="text-slate-600">{shipping.address_line1 || ''}</p>
              {shipping.address_line2 && <p className="text-slate-600">{shipping.address_line2}</p>}
              <p className="text-slate-600">{shipping.city}, {shipping.state} - {shipping.postal_code}</p>
              {shipping.landmark && <p className="text-slate-500 text-sm">📍 Near: {shipping.landmark}</p>}
            </div>
          </div>
          
          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
                  <th className="py-4 px-5 text-left rounded-l-xl text-sm font-semibold uppercase tracking-wider">Item</th>
                  <th className="py-4 px-5 text-center text-sm font-semibold uppercase tracking-wider">Qty</th>
                  <th className="py-4 px-5 text-right text-sm font-semibold uppercase tracking-wider">Price</th>
                  <th className="py-4 px-5 text-right rounded-r-xl text-sm font-semibold uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-4 px-5 border-b border-slate-100">
                      <p className="font-semibold">{item.product_name}</p>
                      {item.variant_name && <p className="text-sm text-slate-500">{item.variant_name}</p>}
                      <p className="text-xs text-slate-400 font-mono">SKU: {item.product_sku}</p>
                    </td>
                    <td className="py-4 px-5 text-center border-b border-slate-100 font-medium">{item.quantity}</td>
                    <td className="py-4 px-5 text-right border-b border-slate-100">{formatCurrency(parseFloat(item.unit_price))}</td>
                    <td className="py-4 px-5 text-right border-b border-slate-100 font-semibold">{formatCurrency(parseFloat(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(parseFloat(order.subtotal))}</span>
                </div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(parseFloat(order.discount_amount))}</span>
                  </div>
                )}
                {parseFloat(order.shipping_cost) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shipping</span>
                    <span>{formatCurrency(parseFloat(order.shipping_cost))}</span>
                  </div>
                )}
                {parseFloat(order.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax</span>
                    <span>{formatCurrency(parseFloat(order.tax_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-blue-500">
                  <span className="text-lg font-bold text-blue-800">Grand Total</span>
                  <span className="text-xl font-bold text-blue-800">{formatCurrency(parseFloat(order.total))}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment Info */}
          <div className="mt-6 flex gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              💳 Payment: {PAYMENT_METHODS.find(m => m.value === order.payment_info?.method)?.label || 'Cash on Delivery'}
            </div>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              STATUS_COLORS[order.status] || 'bg-yellow-100 text-yellow-800'
            )}>
              📋 Status: {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-lg font-semibold text-blue-600">🙏 Thank you for your business!</p>
            <p className="text-slate-500 text-sm mt-2">
              For any queries, contact us at {storeSettings.store_phone || '+91 98765 43210'} | {storeSettings.store_email || 'contact@spcustoms.com'}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
