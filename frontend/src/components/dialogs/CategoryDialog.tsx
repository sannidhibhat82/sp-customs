'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, getImageSrc } from '@/lib/utils';

interface CategoryFormData {
  name: string;
  description: string;
  parent_id: string;
  image_data: string;
  background_color: string;
  is_active: boolean;
  is_featured: boolean;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
  parent_id: '',
  image_data: '',
  background_color: '',
  is_active: true,
  is_featured: false,
};

// Predefined color options for category backgrounds
const colorOptions = [
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Slate', value: '#64748b' },
];

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory?: any;
  defaultParentId?: number;
  onSuccess?: (category: any) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  editingCategory,
  defaultParentId,
  onSuccess,
}: CategoryDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingCategory) {
        setFormData({
          name: editingCategory.name,
          description: editingCategory.description || '',
          parent_id: editingCategory.parent_id ? String(editingCategory.parent_id) : '',
          image_data: editingCategory.image_data || '',
          background_color: editingCategory.background_color || '',
          is_active: editingCategory.is_active,
          is_featured: editingCategory.is_featured,
        });
      } else {
        setFormData({
          ...initialFormData,
          parent_id: defaultParentId ? String(defaultParentId) : '',
        });
      }
    }
  }, [open, editingCategory, defaultParentId]);

  const { data: flatCategories } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => api.getCategories(),
    enabled: open,
  });

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
      setFormData(prev => ({ ...prev, image_data: base64Data }));
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
    mutationFn: (data: any) => api.createCategory(data),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories-flat'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category created!', variant: 'success' });
      onOpenChange(false);
      setFormData(initialFormData);
      onSuccess?.(newCategory);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create category',
        description: error.response?.data?.detail,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCategory(id, data),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories-flat'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category updated!', variant: 'success' });
      onOpenChange(false);
      setFormData(initialFormData);
      onSuccess?.(updatedCategory);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update category',
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
      parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      image_data: formData.image_data || null,
      background_color: formData.background_color || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
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
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Update the category details below.'
                : 'Fill in the details to create a new category.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category Image</label>
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
                {formData.image_data ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-secondary border border-border overflow-hidden flex items-center justify-center">
                      <img
                        src={getImageSrc(formData.image_data)}
                        alt="Category preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Image uploaded</p>
                      <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, image_data: '' }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop image here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Background Color - shown when no image */}
            {!formData.image_data && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Background Color <span className="text-muted-foreground font-normal">(used when no image)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        background_color: prev.background_color === color.value ? '' : color.value 
                      }))}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center",
                        formData.background_color === color.value 
                          ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background ring-primary" 
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.background_color === color.value && (
                        <svg className="w-5 h-5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {/* Custom color input */}
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.background_color || '#f97316'}
                      onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-dashed border-border hover:border-primary/50"
                      title="Custom color"
                    />
                  </div>
                </div>
                {formData.background_color && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: <span className="font-mono">{formData.background_color}</span>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, background_color: '' }))}
                      className="ml-2 text-destructive hover:underline"
                    >
                      Clear
                    </button>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Parent Category</label>
              <Select
                value={formData.parent_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (root category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root category)</SelectItem>
                  {flatCategories
                    ?.filter((c: any) => c.id !== editingCategory?.id)
                    .map((cat: any) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                : editingCategory
                ? 'Update'
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
