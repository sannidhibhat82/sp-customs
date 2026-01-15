'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Search,
  Package,
  Scan,
  CheckCircle2,
  Smartphone,
  Palette,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { compressImage, cn } from '@/lib/utils';

function MobileUploadPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get('product');
  const variantIdFromUrl = searchParams.get('variant');
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-load product if ID provided in URL (from QR code scan)
  const { data: productFromUrl } = useQuery({
    queryKey: ['product', productIdFromUrl],
    queryFn: () => api.getProduct(parseInt(productIdFromUrl!)),
    enabled: !!productIdFromUrl && !selectedProduct,
  });
  
  // Fetch variants for selected product
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', selectedProduct?.id],
    queryFn: () => api.getProductVariants(selectedProduct!.id),
    enabled: !!selectedProduct?.id,
  });
  
  // Auto-select variant from URL
  useEffect(() => {
    if (variantIdFromUrl && variants.length > 0 && !selectedVariant) {
      const variant = variants.find((v: any) => v.id === parseInt(variantIdFromUrl));
      if (variant && !variant.is_default) {
        setSelectedVariant(variant);
      }
    }
  }, [variantIdFromUrl, variants, selectedVariant]);
  
  // Auto-select product when loaded from URL
  useEffect(() => {
    if (productFromUrl && !selectedProduct) {
      setSelectedProduct(productFromUrl);
    }
  }, [productFromUrl, selectedProduct]);

  // Search products
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: () => api.searchProducts(searchQuery, 10),
    enabled: searchQuery.length >= 2,
  });

  // Upload mutation for product images
  const uploadMutation = useMutation({
    mutationFn: async ({ productId, image, isPrimary }: { productId: number; image: string; isPrimary: boolean }) => {
      return api.uploadProductImage(productId, {
        filename: `upload_${Date.now()}.jpg`,
        content_type: 'image/jpeg',
        image_data: image,
        is_primary: isPrimary,
      });
    },
  });

  // Upload mutation for variant images
  const uploadVariantMutation = useMutation({
    mutationFn: async ({ variantId, image, isPrimary }: { variantId: number; image: string; isPrimary: boolean }) => {
      return api.uploadVariantImage(variantId, {
        filename: `upload_${Date.now()}.jpg`,
        content_type: 'image/jpeg',
        image_data: image,
        is_primary: isPrimary,
      });
    },
  });

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
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
  });

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const compressed = await compressImage(files[0], 1920, 0.85);
      setSelectedImages((prev) => [
        ...prev,
        { file: files[0], preview: compressed },
      ]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedProduct || selectedImages.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        // Remove data URL prefix
        const imageData = img.preview.split(',')[1];
        
        if (selectedVariant) {
          // Upload to variant
          await uploadVariantMutation.mutateAsync({
            variantId: selectedVariant.id,
            image: imageData,
            isPrimary: i === 0 && selectedImages.length === 1,
          });
        } else {
          // Upload to product
          await uploadMutation.mutateAsync({
            productId: selectedProduct.id,
            image: imageData,
            isPrimary: i === 0 && selectedImages.length === 1,
          });
        }
        
        setUploadProgress(((i + 1) / selectedImages.length) * 100);
      }

      const targetName = selectedVariant 
        ? `${selectedProduct.name} - ${selectedVariant.name}` 
        : selectedProduct.name;

      toast({
        title: 'Upload Complete!',
        description: `${selectedImages.length} image(s) uploaded successfully`,
        variant: 'success',
      });

      // Show success state
      setUploadedCount(selectedImages.length);
      setUploadComplete(true);
      setSelectedImages([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', selectedProduct.id] });
      queryClient.invalidateQueries({ queryKey: ['product-images', productIdFromUrl] });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass border-b border-border p-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-white">SP</span>
          </div>
          <span className="font-bold">Image Upload</span>
        </Link>
        <Link href="/mobile/scanner">
          <Button variant="outline" size="sm">
            <Scan className="w-4 h-4 mr-1" />
            Scanner
          </Button>
        </Link>
      </header>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Success Screen */}
        {uploadComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <Card className="border-green-500/50 bg-green-500/10">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-green-500 mb-2">
                  Upload Successful!
                </h3>
                <p className="text-muted-foreground mb-4">
                  {uploadedCount} image{uploadedCount !== 1 ? 's' : ''} uploaded to {selectedVariant ? `${selectedProduct?.name} - ${selectedVariant.name}` : selectedProduct?.name}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Images will appear on your laptop automatically
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadComplete(false);
                      setShowVariants(false);
                    }}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Add More Photos
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUploadComplete(false);
                      setSelectedProduct(null);
                      setSelectedVariant(null);
                      setSearchQuery('');
                    }}
                  >
                    Different Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Product from QR indicator */}
        {productIdFromUrl && selectedProduct && !uploadComplete && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Cross-device Upload</p>
              <p className="text-xs text-muted-foreground">
                Photos will sync to your laptop automatically
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Select Product */}
        {!uploadComplete && <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                1
              </span>
              Select Product
            </h3>

            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <Package className="w-8 h-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="text-center py-4 text-muted-foreground">Searching...</div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((product: any) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        <Package className="w-6 h-6 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                  <div className="text-center py-4 text-muted-foreground">No products found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Step 2: Add Images */}
        {!uploadComplete && <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className={cn(
                "w-6 h-6 rounded-full text-sm flex items-center justify-center",
                selectedProduct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                2
              </span>
              Add Images
            </h3>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))}
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
                disabled={!selectedProduct}
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm">Take Photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedProduct}
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-sm">Choose Files</span>
              </Button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                isDragActive ? "border-primary bg-primary/10" : "border-border",
                !selectedProduct && "opacity-50 pointer-events-none"
              )}
            >
              <input {...getInputProps()} disabled={!selectedProduct} />
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop images here
              </p>
            </div>

            {/* Image Previews */}
            {selectedImages.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {selectedImages.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-xs bg-primary px-1.5 py-0.5 rounded text-white">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>}
      </div>

      {/* Upload Button */}
      <div className="glass border-t border-border p-4 mobile-safe-area">
        {isUploading ? (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Uploading... {Math.round(uploadProgress)}%
            </p>
          </div>
        ) : (
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedProduct || selectedImages.length === 0}
            onClick={handleUpload}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function MobileUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <MobileUploadPageContent />
    </Suspense>
  );
}