'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import QRCode from 'react-qr-code';
import {
  ArrowLeft,
  Save,
  Package,
  Plus,
  X,
  Image as ImageIcon,
  Smartphone,
  RefreshCw,
  Trash2,
  Star,
  Copy,
  Check,
  Upload,
  Loader2,
  Printer,
  Barcode,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CategoryDialog, BrandDialog } from '@/components/dialogs';
import { VariantManager } from '@/components/admin/VariantManager';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { compressImage, cn } from '@/lib/utils';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    cost_price: '',
    compare_at_price: '',
    category_id: '',
    brand_id: '',
    is_active: true,
    is_featured: false,
    is_new: true,
  });
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);

  // Fetch product data
  const { data: product, isLoading, refetch: refetchProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.getProduct(parseInt(productId)),
    enabled: !!productId,
  });

  // Fetch product images with auto-refresh
  const { data: images, refetch: refetchImages } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => api.getProductImages(parseInt(productId)),
    enabled: !!productId,
    refetchInterval: autoRefresh ? 3000 : false,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  // Populate form when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        compare_at_price: product.compare_at_price?.toString() || '',
        category_id: product.category_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
        is_new: product.is_new ?? true,
      });
      
      if (product.attributes) {
        const attrArray = Object.entries(product.attributes).map(([key, value]) => ({
          key,
          value: value as string,
        }));
        setAttributes(attrArray);
      }
      
      if (product.features) {
        setFeatures(product.features);
      }
    }
  }, [product]);

  // Image upload via dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploadingImages(true);
    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const compressed = await compressImage(file, 1920, 0.85);
        const imageData = compressed.split(',')[1];
        
        await api.uploadProductImage(parseInt(productId), {
          filename: `product_${productId}_${Date.now()}.jpg`,
          content_type: 'image/jpeg',
          image_data: imageData,
          is_primary: !images || images.length === 0,
        });
      }
      refetchImages();
      toast({ title: `${acceptedFiles.length} image(s) uploaded!`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploadingImages(false);
    }
  }, [productId, images, refetchImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateProduct(parseInt(productId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast({ title: 'Product updated!', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update product',
        description: error.response?.data?.detail || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => api.deleteProductImage(parseInt(productId), imageId),
    onSuccess: () => {
      refetchImages();
      toast({ title: 'Image deleted', variant: 'success' });
    },
  });

  // Set primary image mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: number) => api.setProductPrimaryImage(parseInt(productId), imageId),
    onSuccess: () => {
      refetchImages();
      refetchProduct();
      toast({ title: 'Primary image updated', variant: 'success' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const attributesObj: Record<string, string> = {};
    attributes.forEach((attr) => {
      if (attr.key && attr.value) {
        attributesObj[attr.key] = attr.value;
      }
    });

    updateMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      attributes: attributesObj,
      features: features,
    });
  };

  const addAttribute = () => setAttributes([...attributes, { key: '', value: '' }]);
  const removeAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index));
  const updateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };
  const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index));

  // Mobile upload URL
  const mobileUploadUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/mobile/upload?product=${productId}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mobileUploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied!', variant: 'success' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Link href="/admin/products">
          <Button className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">SKU: {product.sku} | Barcode: {product.barcode}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowMobileQR(!showMobileQR)}
          className="gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Mobile Upload
        </Button>
      </div>

      {/* Mobile QR Panel */}
      <AnimatePresence>
        {showMobileQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCode value={mobileUploadUrl} size={120} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold mb-2">Upload from Mobile</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Scan QR code with your phone to take photos and upload them.
                    </p>
                    <div className="flex gap-2 items-center justify-center md:justify-start">
                      <Input value={mobileUploadUrl} readOnly className="max-w-sm text-sm" />
                      <Button variant="outline" size="icon" onClick={copyToClipboard}>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin")} />
                      Auto-refresh images
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Product Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Short Description</label>
                  <Input
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Full Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <SearchableSelect
                      value={formData.category_id}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                      options={categories || []}
                      placeholder="Select category"
                      searchPlaceholder="Search categories..."
                      onAddNew={() => setShowCategoryDialog(true)}
                      addNewLabel="+ Add new category"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Brand</label>
                    <SearchableSelect
                      value={formData.brand_id}
                      onValueChange={(v) => setFormData({ ...formData, brand_id: v })}
                      options={brands || []}
                      placeholder="Select brand"
                      searchPlaceholder="Search brands..."
                      onAddNew={() => setShowBrandDialog(true)}
                      addNewLabel="+ Add new brand"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price (₹)</label>
                    <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Compare at (₹)</label>
                    <Input type="number" step="0.01" value={formData.compare_at_price} onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cost (₹)</label>
                    <Input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attributes & Features */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Attributes</CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={addAttribute}><Plus className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {attributes.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-2">No attributes</p>
                  ) : (
                    attributes.map((attr, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input placeholder="Name" value={attr.key} onChange={(e) => updateAttribute(index, 'key', e.target.value)} className="flex-1 h-9" />
                        <Input placeholder="Value" value={attr.value} onChange={(e) => updateAttribute(index, 'value', e.target.value)} className="flex-1 h-9" />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeAttribute(index)}><X className="w-4 h-4" /></Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Add feature" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())} className="h-9" />
                    <Button type="button" size="sm" onClick={addFeature} className="h-9"><Plus className="w-4 h-4" /></Button>
                  </div>
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {features.map((feature, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs">
                          {feature}
                          <button type="button" onClick={() => removeFeature(index)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="w-4 h-4 rounded" />
                    <span>Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_new} onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })} className="w-4 h-4 rounded" />
                    <span>New Arrival</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4 justify-end">
              <Link href="/admin/products"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>

          {/* Product Variants */}
          <VariantManager
            productId={parseInt(productId)}
            productName={product.name}
            productSku={product.sku}
            productPrice={product.price ? parseFloat(product.price) : undefined}
          />
        </div>

        {/* Images Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetchImages()} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {/* Dropzone for PC upload */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-4",
                  isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  isUploadingImages && "pointer-events-none opacity-50"
                )}
              >
                <input {...getInputProps()} />
                {isUploadingImages ? (
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Drop images or click to upload</p>
                  </>
                )}
              </div>

              {/* Existing Images */}
              {images && images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((image: any) => {
                    const imgSrc = image.image_data?.startsWith('data:') 
                      ? image.image_data 
                      : `data:image/jpeg;base64,${image.image_data}`;
                    return (
                    <motion.div
                      key={image.id}
                      layout
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                    >
                      <img src={imgSrc} alt={image.alt_text || 'Product'} className="w-full h-full object-cover" />
                      {image.is_primary && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                          Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!image.is_primary && (
                          <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => setPrimaryMutation.mutate(image.id)}>
                            <Star className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" className="w-7 h-7" onClick={() => deleteImageMutation.mutate(image.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );})}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No images yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Product Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock</span>
                <span className="font-medium">{product.inventory?.quantity ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(product.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Barcode */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Barcode className="w-4 h-4" />
                Barcode
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const barcodeImgSrc = product.barcode_data?.startsWith('data:') 
                    ? product.barcode_data 
                    : `data:image/png;base64,${product.barcode_data}`;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Print Barcode - ${product.name}</title>
                          <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                            .product-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                            .sku { font-size: 14px; color: #666; margin-bottom: 20px; }
                            .barcode-container { margin: 20px auto; }
                            .barcode-container img { max-width: 100%; }
                            .barcode-text { font-size: 12px; margin-top: 5px; }
                            @media print { body { padding: 0; } }
                          </style>
                        </head>
                        <body>
                          <div class="product-name">${product.name}</div>
                          <div class="sku">SKU: ${product.sku}</div>
                          ${product.barcode_data ? `
                            <div class="barcode-container">
                              <img src="${barcodeImgSrc}" alt="Barcode" />
                              <div class="barcode-text">${product.barcode}</div>
                            </div>
                          ` : ''}
                          <script>window.onload = () => { window.print(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </CardHeader>
            <CardContent>
              {product.barcode_data ? (
                <div className="bg-white p-3 rounded-lg text-center">
                  <img 
                    src={product.barcode_data.startsWith('data:') ? product.barcode_data : `data:image/png;base64,${product.barcode_data}`} 
                    alt="Barcode" 
                    className="mx-auto max-w-full" 
                  />
                  <p className="text-xs text-black mt-2 font-mono">{product.barcode}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No barcode generated</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reusable Category Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onSuccess={(newCategory) => {
          setFormData({ ...formData, category_id: String(newCategory.id) });
        }}
      />

      {/* Reusable Brand Dialog */}
      <BrandDialog
        open={showBrandDialog}
        onOpenChange={setShowBrandDialog}
        onSuccess={(newBrand) => {
          setFormData({ ...formData, brand_id: String(newBrand.id) });
        }}
      />
    </div>
  );
}
