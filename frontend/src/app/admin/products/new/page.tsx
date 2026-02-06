'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft,
  Save,
  Package,
  Plus,
  X,
  Image as ImageIcon,
  Upload,
  Loader2,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CategoryDialog, BrandDialog } from '@/components/dialogs';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { compressImage, cn } from '@/lib/utils';

interface PreviewImage {
  file: File;
  preview: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    cost_price: '',
    compare_at_price: '',
    category_id: '',
    brand_id: '',
    initial_quantity: '0',
    custom_sku: '',
    is_active: true,
    is_featured: false,
    is_new: true,
    visibility: 'visible',
  });
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [selectedImages, setSelectedImages] = useState<PreviewImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  // Handle image drop/select for product
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages = await Promise.all(
      acceptedFiles.map(async (file) => {
        const compressed = await compressImage(file, 1920, 0.85);
        return {
          file,
          preview: compressed,
        };
      })
    );
    setSelectedImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const product = await api.createProduct(data);
      
      if (selectedImages.length > 0) {
        setIsUploading(true);
        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          const imageData = img.preview.split(',')[1];
          await api.uploadProductImage(product.id, {
            filename: `product_${product.id}_${i + 1}.jpg`,
            content_type: 'image/jpeg',
            image_data: imageData,
            is_primary: i === 0,
          });
        }
        setIsUploading(false);
      }
      
      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Product created!', variant: 'success' });
      router.push(`/admin/products/${product.id}`);
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({
        title: 'Failed to create product',
        description: error.response?.data?.detail || 'Unknown error',
        variant: 'destructive',
      });
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

    createMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
      initial_quantity: parseInt(formData.initial_quantity) || 0,
      custom_sku: formData.custom_sku || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      visibility: formData.visibility,
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

  const isPending = createMutation.isPending || isUploading;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Product</h1>
          <p className="text-muted-foreground">Create a new product in your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
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
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Short Description</label>
                  <Input
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="Brief description for listings"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Full Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed product description"
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
                <CardTitle>Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Compare at (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.compare_at_price}
                      onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cost (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Initial Stock</label>
                  <Input
                    type="number"
                    value={formData.initial_quantity}
                    onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                    placeholder="0"
                    className="max-w-[200px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Attributes & Features */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Attributes</CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={addAttribute}>
                    <Plus className="w-4 h-4" />
                  </Button>
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

            {/* Status & Visibility */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4" />
                  Status & Visibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Visibility Dropdown */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Visibility</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="visible">Visible - Show everywhere</option>
                    <option value="hidden">Hidden - Active but not shown to users (admin only)</option>
                    <option value="catalog_only">Catalog Only - Show in catalog, not homepage</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.visibility === 'hidden' && "Product is active but won't appear on public pages. Still visible in admin, orders, and inventory."}
                    {formData.visibility === 'catalog_only' && "Product appears in catalog/category pages but not on homepage or featured sections."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Images Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Product Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag & drop images here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to select</p>
                </div>

                <AnimatePresence>
                  {selectedImages.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 grid grid-cols-2 gap-2">
                      {selectedImages.map((img, index) => (
                        <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                          <img src={img.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                          {index === 0 && <span className="absolute top-1 left-1 text-xs bg-primary px-1.5 py-0.5 rounded text-white">Primary</span>}
                          <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedImages.length > 0 && <p className="text-xs text-muted-foreground mt-2 text-center">{selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SKU & Barcode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Custom SKU (Optional)</label>
                  <Input
                    value={formData.custom_sku}
                    onChange={(e) => setFormData({ ...formData, custom_sku: e.target.value.toUpperCase() })}
                    placeholder="e.g., ABC-12345"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your existing SKU/barcode if you have one. Leave empty to auto-generate.
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    If custom SKU is provided, it will be used as both SKU and barcode. Otherwise, both will be auto-generated.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Product Variants</strong> (colors, sizes, etc.) can be added after creating the product.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <Link href="/admin/products"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isPending || !formData.name}>
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isUploading ? 'Uploading images...' : 'Creating...'}</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Create Product</>
            )}
          </Button>
        </div>
      </form>

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
