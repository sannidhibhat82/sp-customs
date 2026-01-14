'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn, getImageSrc } from '@/lib/utils';

interface BrandFormData {
  name: string;
  description: string;
  website: string;
  logo_data: string;
  is_active: boolean;
  is_featured: boolean;
}

const initialFormData: BrandFormData = {
  name: '',
  description: '',
  website: '',
  logo_data: '',
  is_active: true,
  is_featured: false,
};

interface BrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBrand?: any;
  onSuccess?: (brand: any) => void;
}

export function BrandDialog({
  open,
  onOpenChange,
  editingBrand,
  onSuccess,
}: BrandDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<BrandFormData>(initialFormData);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingBrand) {
        setFormData({
          name: editingBrand.name,
          description: editingBrand.description || '',
          website: editingBrand.website || '',
          logo_data: editingBrand.logo_data || '',
          is_active: editingBrand.is_active,
          is_featured: editingBrand.is_featured,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, editingBrand]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image must be less than 2MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1];
      setFormData(prev => ({ ...prev, logo_data: base64Data }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createBrand(data),
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand created!', variant: 'success' });
      onOpenChange(false);
      setFormData(initialFormData);
      onSuccess?.(newBrand);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create brand',
        description: error.response?.data?.detail,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateBrand(id, data),
    onSuccess: (updatedBrand) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand updated!', variant: 'success' });
      onOpenChange(false);
      setFormData(initialFormData);
      onSuccess?.(updatedBrand);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update brand',
        description: error.response?.data?.detail,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      description: formData.description || null,
      website: formData.website || null,
      logo_data: formData.logo_data || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
    };

    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? 'Edit Brand' : 'Create Brand'}
            </DialogTitle>
            <DialogDescription>
              {editingBrand
                ? 'Update the brand details below.'
                : 'Fill in the details to create a new brand.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Logo Upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Logo</label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {formData.logo_data ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center">
                      <img
                        src={getImageSrc(formData.logo_data)}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Logo uploaded</p>
                      <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, logo_data: '' }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop logo here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Brand name"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brand description"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Website</label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span>Featured</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.name.trim()}>
              {isPending
                ? 'Saving...'
                : editingBrand
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
