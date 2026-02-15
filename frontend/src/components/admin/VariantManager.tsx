'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Trash2,
  Edit,
  Image as ImageIcon,
  Package,
  ChevronDown,
  ChevronUp,
  Palette,
  Ruler,
  Save,
  Upload,
  Printer,
  Barcode,
  Smartphone,
  Copy,
  QrCode,
} from 'lucide-react';
import QRCode from 'react-qr-code';
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
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, compressImage, getImageSrc } from '@/lib/utils';

interface ProductImage {
  id: number;
  uuid: string;
  filename: string;
  image_data: string;
  is_primary: boolean;
  sort_order: number;
}

interface VariantManagerProps {
  productId: number;
  productName: string;
  productSku: string;
  productPrice?: number;
  productImages?: ProductImage[];  // Main product images for "use same" feature
}

interface VariantImage {
  id: number;
  uuid: string;
  filename: string;
  image_data: string;
  is_primary: boolean;
  sort_order: number;
}

interface Variant {
  id: number;
  uuid: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  options: Record<string, string>;
  price: number | null;
  compare_at_price: number | null;
  primary_image: string | null;
  images: VariantImage[];
  inventory_quantity: number;
  is_in_stock: boolean;
  is_active: boolean;
  is_default: boolean;
}

const PRESET_OPTIONS = [
  { name: 'Color', values: ['Red', 'Blue', 'Black', 'White', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Grey'] },
  { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Material', values: ['Leather', 'Fabric', 'Plastic', 'Metal', 'Carbon Fiber'] },
];

export function VariantManager({ productId, productName, productSku, productPrice, productImages = [] }: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState<{ open: boolean; variantId: number | null }>({
    open: false,
    variantId: null,
  });
  const [showMobileUploadDialog, setShowMobileUploadDialog] = useState<{ open: boolean; variant: Variant | null }>({
    open: false,
    variant: null,
  });
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());
  const [barcodeImages, setBarcodeImages] = useState<Record<number, string>>({});

  // Form state for new/edit variant
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    price: '',
    compare_at_price: '',
    initial_quantity: '0',
    is_active: true,
    is_default: false,
    options: {} as Record<string, string>,
  });

  // Selected option type for adding
  const [selectedOptionType, setSelectedOptionType] = useState('');
  const [customOptionName, setCustomOptionName] = useState('');
  const [customOptionValue, setCustomOptionValue] = useState('');

  // Fetch variants
  const { data: variants = [], isLoading, refetch } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => api.getProductVariants(productId),
  });

  // Fetch global variant option templates (so custom options appear for all products)
  const { data: apiVariantOptions = [], refetch: refetchVariantOptions } = useQuery({
    queryKey: ['variant-options'],
    queryFn: () => api.getVariantOptions(),
  });

  // Merge preset options with API options (presets first, then API; dedupe by name)
  const presetNames = new Set(PRESET_OPTIONS.map((o) => o.name));
  const allOptionTypes = [
    ...PRESET_OPTIONS,
    ...apiVariantOptions
      .filter((o: { name: string }) => !presetNames.has(o.name))
      .map((o: { name: string; values?: string[] }) => ({ name: o.name, values: o.values || [] })),
  ];

  // Create variant mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.createVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Variant created successfully' });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating variant',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Update variant mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Variant updated successfully' });
      resetForm();
      setEditingVariant(null);
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating variant',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Delete variant mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Variant deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting variant',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ variantId, file, isPrimary = false }: { variantId: number; file: File; isPrimary?: boolean }) => {
      const compressed = await compressImage(file);
      return api.uploadVariantImage(variantId, {
        filename: file.name,
        content_type: 'image/jpeg',
        image_data: compressed,
        is_primary: isPrimary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Image uploaded successfully' });
      setShowImageDialog({ open: false, variantId: null });
    },
    onError: (error: any) => {
      toast({
        title: 'Error uploading image',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: ({ variantId, imageId }: { variantId: number; imageId: number }) =>
      api.deleteVariantImage(variantId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Image deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting image',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Track which variants should use product images (stored locally, not duplicated)
  const [variantsUsingProductImages, setVariantsUsingProductImages] = useState<Set<number>>(new Set());

  // Toggle variant to use/not use product images
  const toggleUseProductImages = (variantId: number) => {
    setVariantsUsingProductImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
    toast({ 
      title: variantsUsingProductImages.has(variantId) 
        ? 'Variant will use its own images' 
        : 'Variant will use main product images' 
    });
    setShowImageDialog({ open: false, variantId: null });
  };

  const resetForm = () => {
    setVariantForm({
      name: '',
      sku: '',
      price: '',
      compare_at_price: '',
      initial_quantity: '0',
      is_active: true,
      is_default: false,
      options: {},
    });
    setSelectedOptionType('');
    setCustomOptionName('');
    setCustomOptionValue('');
  };

  // Save custom option to backend so it appears in dropdown for other products
  const createVariantOptionMutation = useMutation({
    mutationFn: (data: { name: string; values: string[] }) => api.createVariantOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-options'] });
      refetchVariantOptions();
    },
  });
  const updateVariantOptionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { values: string[] } }) => api.updateVariantOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-options'] });
      refetchVariantOptions();
    },
  });

  const handleAddOption = (optionName: string, optionValue: string) => {
    if (!optionName || !optionValue) return;
    
    setVariantForm(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [optionName]: optionValue,
      },
    }));
    
    // Auto-generate variant name from options
    const newOptions = { ...variantForm.options, [optionName]: optionValue };
    const optionValues = Object.values(newOptions);
    setVariantForm(prev => ({
      ...prev,
      name: optionValues.join(' / '),
      options: newOptions,
    }));
    
    setSelectedOptionType('');
    setCustomOptionValue('');
  };

  const handleAddCustomOptionAndSave = async () => {
    if (!customOptionName?.trim() || !customOptionValue?.trim()) return;
    const name = customOptionName.trim();
    const value = customOptionValue.trim();
    try {
      const existing = apiVariantOptions.find((o: { name: string }) => o.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        const newValues = [...(existing.values || []), value].filter((v, i, a) => a.indexOf(v) === i);
        await updateVariantOptionMutation.mutateAsync({ id: existing.id, data: { values: newValues } });
      } else {
        await createVariantOptionMutation.mutateAsync({ name, values: [value] });
      }
      handleAddOption(name, value);
      setCustomOptionName('');
      setCustomOptionValue('');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d.msg || d).join(', ') : (typeof detail === 'string' ? detail : 'Failed to save option');
      toast({ title: 'Could not save custom option', description: msg, variant: 'destructive' });
    }
  };

  const handleRemoveOption = (optionName: string) => {
    const newOptions = { ...variantForm.options };
    delete newOptions[optionName];
    
    const optionValues = Object.values(newOptions);
    setVariantForm(prev => ({
      ...prev,
      name: optionValues.join(' / ') || '',
      options: newOptions,
    }));
  };

  const handleSubmit = () => {
    if (!variantForm.name || Object.keys(variantForm.options).length === 0) {
      toast({
        title: 'Please add at least one option',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      name: variantForm.name,
      sku: variantForm.sku || undefined,
      options: variantForm.options,
      price: variantForm.price ? parseFloat(variantForm.price) : undefined,
      compare_at_price: variantForm.compare_at_price ? parseFloat(variantForm.compare_at_price) : undefined,
      is_active: variantForm.is_active,
      is_default: variantForm.is_default,
      initial_quantity: parseInt(variantForm.initial_quantity) || 0,
    };

    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (variant: Variant) => {
    setEditingVariant(variant);
    setVariantForm({
      name: variant.name,
      sku: variant.sku || '',
      price: variant.price?.toString() || '',
      compare_at_price: variant.compare_at_price?.toString() || '',
      initial_quantity: variant.inventory_quantity?.toString() || '0',
      is_active: variant.is_active,
      is_default: variant.is_default,
      options: variant.options || {},
    });
    setShowAddDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !showImageDialog.variantId) return;
    
    // Find the current variant to check if it already has images
    const currentVariant = variants.find((v: Variant) => v.id === showImageDialog.variantId);
    const hasExistingImages = (currentVariant?.images?.length || 0) > 0;
    
    // Upload all selected files
    Array.from(files).forEach((file, index) => {
      // First image is primary only if no existing images
      const isPrimary = !hasExistingImages && index === 0;
      uploadImageMutation.mutate({ variantId: showImageDialog.variantId!, file, isPrimary });
    });
  };

  const toggleExpand = async (variantId: number) => {
    const variant = variants.find((v: Variant) => v.id === variantId);
    
    setExpandedVariants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
        // Load barcode image if expanding and not already loaded
        if (variant?.barcode && !barcodeImages[variantId]) {
          api.getVariantBarcodeImage(variantId)
            .then(data => {
              setBarcodeImages(prev => ({ ...prev, [variantId]: data.barcode_image }));
            })
            .catch(() => {
              // Silent fail - barcode image is optional
            });
        }
      }
      return newSet;
    });
  };

  const handlePrintBarcode = (variant: Variant, barcodeImage?: string) => {
    if (!barcodeImage) {
      toast({ title: 'Barcode image not loaded yet', variant: 'destructive' });
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Failed to open print window', variant: 'destructive' });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${variant.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .barcode-container {
              display: inline-block;
              padding: 20px;
            }
            .barcode-image { max-width: 300px; }
            .variant-name { font-weight: bold; margin-top: 10px; }
            .sku { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <img src="data:image/png;base64,${barcodeImage}" class="barcode-image" />
            <div class="variant-name">${productName} - ${variant.name}</div>
            <div class="sku">SKU: ${variant.sku}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Product Variants
        </CardTitle>
        <Button
          onClick={() => {
            resetForm();
            setEditingVariant(null);
            setShowAddDialog(true);
          }}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Variant
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading variants...</div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No variants yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add variants like different colors or sizes for this product
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant: Variant) => (
              <motion.div
                key={variant.id}
                layout
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Variant Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => toggleExpand(variant.id)}
                >
                  {/* Image - Show product image if using same, otherwise variant image */}
                  <div className={cn(
                    "w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0",
                    variantsUsingProductImages.has(variant.id) && "ring-2 ring-primary/50"
                  )}>
                    {variant.primary_image ? (
                      <img
                        src={getImageSrc(variant.primary_image)}
                        alt={variant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : variantsUsingProductImages.has(variant.id) && productImages && productImages.length > 0 ? (
                      <img
                        src={getImageSrc(productImages[0].image_data)}
                        alt={variant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{variant.name}</h4>
                      {variant.is_default && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                          Default
                        </span>
                      )}
                      {!variant.is_active && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>SKU: {variant.sku || '-'}</span>
                      <span>Stock: {variant.inventory_quantity}</span>
                      <span>
                        ₹{(variant.price || productPrice || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {/* Options tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(variant.options || {}).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 bg-secondary text-xs rounded-full"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Upload buttons only for non-default variants */}
                    {!variant.is_default && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileUploadDialog({ open: true, variant });
                          }}
                          title="Mobile upload QR code"
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageDialog({ open: true, variantId: variant.id });
                          }}
                          title="Upload variant images"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(variant);
                      }}
                      title="Edit variant"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {/* Don't allow deleting default variant */}
                    {!variant.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this variant?')) {
                            deleteMutation.mutate(variant.id);
                          }
                        }}
                        title="Delete variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {expandedVariants.has(variant.id) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedVariants.has(variant.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-secondary/20"
                    >
                      <div className="p-4 space-y-4">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price</span>
                            <p className="font-medium">₹{(variant.price || productPrice || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Compare Price</span>
                            <p className="font-medium">
                              {variant.compare_at_price 
                                ? `₹${variant.compare_at_price.toLocaleString('en-IN')}`
                                : '-'
                              }
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stock</span>
                            <p className={cn(
                              "font-medium",
                              variant.inventory_quantity === 0 ? "text-red-400" :
                              variant.inventory_quantity <= 5 ? "text-yellow-400" :
                              "text-green-400"
                            )}>
                              {variant.inventory_quantity} units
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status</span>
                            <p className="font-medium">
                              {variant.is_in_stock ? 'In Stock' : 'Out of Stock'}
                            </p>
                          </div>
                        </div>

                        {/* Barcode */}
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <Barcode className="w-4 h-4" />
                              Variant Barcode
                            </span>
                            {variant.barcode && barcodeImages[variant.id] && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintBarcode(variant, barcodeImages[variant.id]);
                                }}
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Barcode
                              </Button>
                            )}
                          </div>
                          {variant.barcode ? (
                            <div className="flex items-start gap-6">
                              {/* Barcode Image */}
                              <div className="bg-white p-3 rounded-lg border border-border">
                                {barcodeImages[variant.id] ? (
                                  <img
                                    src={`data:image/png;base64,${barcodeImages[variant.id]}`}
                                    alt={`Barcode for ${variant.name}`}
                                    className="h-16"
                                  />
                                ) : (
                                  <div className="h-16 w-40 flex items-center justify-center text-muted-foreground text-sm">
                                    Loading barcode...
                                  </div>
                                )}
                              </div>
                              {/* Barcode Info */}
                              <div className="flex-1">
                                <p className="font-mono text-lg text-primary font-semibold">{variant.barcode}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Scan this barcode in the mobile scanner to add/remove inventory for this variant
                                </p>
                                {variant.is_default && (
                                  <p className="text-xs text-primary mt-2 font-medium">
                                    ★ Default variant - Same barcode as the main product
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No barcode assigned</p>
                          )}
                        </div>

                        {/* Images Section - Only for non-default variants */}
                        {variant.is_default ? (
                          <div className="border-t border-border pt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                              <span>Default variant uses product images</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Edit product images in the Images section above
                            </p>
                          </div>
                        ) : (
                          <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-muted-foreground">
                                {variantsUsingProductImages.has(variant.id) 
                                  ? 'Using Main Product Images' 
                                  : `Variant Images (${variant.images?.length || 0})`}
                              </span>
                              <div className="flex items-center gap-2">
                                {!variantsUsingProductImages.has(variant.id) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMobileUploadDialog({ open: true, variant });
                                      }}
                                      title="Scan QR to upload from phone"
                                    >
                                      <QrCode className="w-4 h-4 mr-2" />
                                      Mobile
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowImageDialog({ open: true, variantId: variant.id });
                                  }}
                                >
                                  {variantsUsingProductImages.has(variant.id) ? (
                                    <>
                                      <ImageIcon className="w-4 h-4 mr-2" />
                                      Change
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Add Image
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Show product images if using same as main product */}
                            {variantsUsingProductImages.has(variant.id) && productImages && productImages.length > 0 ? (
                              <div>
                                <div className="flex flex-wrap gap-3 mb-2">
                                  {productImages.map((img, i) => (
                                    <div 
                                      key={img.id || i}
                                      className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/30 bg-secondary"
                                    >
                                      <img
                                        src={getImageSrc(img.image_data)}
                                        alt={`Product image ${i + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      {img.is_primary && (
                                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-primary flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Same images as main product (not duplicated)
                                </p>
                              </div>
                            ) : variant.images && variant.images.length > 0 ? (
                              <div className="flex flex-wrap gap-3">
                                {variant.images.map((img) => (
                                  <div 
                                    key={img.id}
                                    className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary"
                                  >
                                    <img
                                      src={getImageSrc(img.image_data)}
                                      alt={variant.name}
                                      className="w-full h-full object-cover"
                                    />
                                    {img.is_primary && (
                                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] rounded">
                                        Primary
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this image?')) {
                                          deleteImageMutation.mutate({ variantId: variant.id, imageId: img.id });
                                        }
                                      }}
                                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-2">No images for this variant</p>
                                {productImages && productImages.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleUseProductImages(variant.id);
                                    }}
                                  >
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Use Same as Main Product
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Variant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? 'Edit Variant' : 'Add New Variant'}
            </DialogTitle>
            <DialogDescription>
              Create a variant with different options like color or size
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Option Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Add Option</label>
              <div className="flex gap-2">
                <select
                  value={selectedOptionType}
                  onChange={(e) => setSelectedOptionType(e.target.value)}
                  className="flex-1 h-10 px-3 bg-background border border-border rounded-lg"
                >
                  <option value="">Select option type...</option>
                  {allOptionTypes.map((opt: { name: string }) => (
                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                  ))}
                  <option value="custom">+ Custom Option</option>
                </select>
              </div>

              {/* Values for selected option type (preset or saved custom) */}
              {selectedOptionType && selectedOptionType !== 'custom' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {allOptionTypes.find((o: { name: string }) => o.name === selectedOptionType)?.values.map((val: string) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddOption(selectedOptionType, val)}
                      disabled={variantForm.options[selectedOptionType] === val}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              )}

              {/* Custom Option (saved to backend so it appears for other products) */}
              {selectedOptionType === 'custom' && (
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Option name (e.g., Style)"
                    value={customOptionName}
                    onChange={(e) => setCustomOptionName(e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g., Modern)"
                    value={customOptionValue}
                    onChange={(e) => setCustomOptionValue(e.target.value)}
                  />
                  <Button
                    onClick={handleAddCustomOptionAndSave}
                    disabled={!customOptionName?.trim() || !customOptionValue?.trim() || createVariantOptionMutation.isPending || updateVariantOptionMutation.isPending}
                  >
                    Add & save for all products
                  </Button>
                </div>
              )}
            </div>

            {/* Selected Options */}
            {Object.keys(variantForm.options).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selected Options</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variantForm.options).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-full flex items-center gap-2"
                    >
                      {key}: {value}
                      <button
                        onClick={() => handleRemoveOption(key)}
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variant Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Variant Name</label>
              <Input
                value={variantForm.name}
                onChange={(e) => setVariantForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Auto-generated from options"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="text-sm font-medium mb-2 block">SKU (Optional)</label>
              <Input
                value={variantForm.sku}
                onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder={`${productSku}-variant`}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Price (₹)</label>
                <Input
                  type="number"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder={productPrice?.toString() || '0'}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Compare Price (₹)</label>
                <Input
                  type="number"
                  value={variantForm.compare_at_price}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, compare_at_price: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Initial Stock */}
            {!editingVariant && (
              <div>
                <label className="text-sm font-medium mb-2 block">Initial Stock Quantity</label>
                <Input
                  type="number"
                  value={variantForm.initial_quantity}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, initial_quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={variantForm.is_active}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
              {/* Note: First variant is automatically set as default by the backend */}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                'Saving...'
              ) : editingVariant ? (
                'Update Variant'
              ) : (
                'Create Variant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Image Dialog */}
      <Dialog open={showImageDialog.open} onOpenChange={(open) => setShowImageDialog({ open, variantId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Variant Images</DialogTitle>
            <DialogDescription>
              Upload images specific to this variant (e.g., product in this color). You can select multiple images.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Use Same as Main Product Option */}
            {productImages && productImages.length > 0 ? (
              <div className="border border-primary/50 bg-primary/5 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Use Same as Main Product</p>
                    <p className="text-xs text-muted-foreground">
                      Display the same {productImages.length} image(s) as the main product (no duplication)
                    </p>
                  </div>
                  <Button
                    variant={showImageDialog.variantId && variantsUsingProductImages.has(showImageDialog.variantId) ? "secondary" : "default"}
                    size="sm"
                    onClick={() => {
                      if (showImageDialog.variantId) {
                        toggleUseProductImages(showImageDialog.variantId);
                      }
                    }}
                  >
                    {showImageDialog.variantId && variantsUsingProductImages.has(showImageDialog.variantId) 
                      ? 'Using Product Images ✓' 
                      : 'Use Product Images'}
                  </Button>
                </div>
                {/* Preview of product images */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {productImages.slice(0, 5).map((img, i) => (
                    <div key={img.id || i} className="w-12 h-12 rounded bg-secondary overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={getImageSrc(img.image_data)}
                        alt={`Product image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {productImages.length > 5 && (
                    <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                      +{productImages.length - 5}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No main product images available</p>
                <p className="text-xs text-muted-foreground">Upload images to the main product first, or upload variant-specific images below</p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload variant-specific images</span>
              </div>
            </div>

            {/* Desktop Upload */}
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB each. Select multiple files.</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadImageMutation.isPending}
              />
            </label>
            
            {/* Mobile Upload Option */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Upload from Phone</p>
                  <p className="text-xs text-muted-foreground">Take photos directly with your phone camera</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showImageDialog.variantId) {
                      const variant = variants.find((v: Variant) => v.id === showImageDialog.variantId);
                      if (variant) {
                        setShowImageDialog({ open: false, variantId: null });
                        setShowMobileUploadDialog({ open: true, variant });
                      }
                    }
                  }}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Show QR
                </Button>
              </div>
            </div>
            
            {uploadImageMutation.isPending && (
              <p className="text-center text-muted-foreground">Uploading...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Upload QR Code Dialog */}
      <Dialog 
        open={showMobileUploadDialog.open} 
        onOpenChange={(open) => setShowMobileUploadDialog({ open, variant: null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Mobile Upload
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your phone to upload images for{' '}
              <span className="font-medium text-foreground">{showMobileUploadDialog.variant?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-lg">
                {showMobileUploadDialog.variant && (
                  <QRCode
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/mobile/upload?product=${productId}&variant=${showMobileUploadDialog.variant.id}`}
                    size={200}
                    level="M"
                  />
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                <p className="text-muted-foreground">Open your phone's camera app</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                <p className="text-muted-foreground">Point at the QR code to scan</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                <p className="text-muted-foreground">Take photos or select from gallery</p>
              </div>
            </div>

            {/* Copy Link Option */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (showMobileUploadDialog.variant) {
                    const uploadUrl = `${window.location.origin}/mobile/upload?product=${productId}&variant=${showMobileUploadDialog.variant.id}`;
                    navigator.clipboard.writeText(uploadUrl);
                    toast({ 
                      title: 'Link copied!', 
                      description: 'Share or open this link on your phone',
                    });
                  }
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link Instead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
