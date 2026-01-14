'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Layers,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Package,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryDialog } from '@/components/dialogs';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, getImageSrc } from '@/lib/utils';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [defaultParentId, setDefaultParentId] = useState<number | undefined>(undefined);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: any }>({
    open: false,
    category: null,
  });

  const { data: categoryTree, isLoading } = useQuery({
    queryKey: ['category-tree'],
    queryFn: () => api.getCategoryTree(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories-flat'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category deleted', variant: 'success' });
      setDeleteDialog({ open: false, category: null });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete category',
        description: error.response?.data?.detail,
        variant: 'destructive',
      });
    },
  });

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const openCreateDialog = (parentId?: number) => {
    setEditingCategory(null);
    setDefaultParentId(parentId);
    setDialogOpen(true);
  };

  const openEditDialog = (category: any) => {
    setEditingCategory(category);
    setDefaultParentId(undefined);
    setDialogOpen(true);
  };

  const renderCategory = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors",
            level > 0 && "ml-6 border-l border-border"
          )}
        >
          <button
            onClick={() => hasChildren && toggleExpand(category.id)}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded",
              hasChildren && "hover:bg-secondary"
            )}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : null}
          </button>

          <div className={cn(
            "w-8 h-8 rounded flex items-center justify-center overflow-hidden",
            category.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {category.image_data ? (
              <img
                src={getImageSrc(category.image_data)}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            ) : hasChildren && isExpanded ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium">{category.name}</p>
            {category.description && (
              <p className="text-sm text-muted-foreground truncate">{category.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!category.is_active && (
              <span className="badge bg-muted text-muted-foreground">Inactive</span>
            )}
            {category.is_featured && (
              <span className="badge badge-info">Featured</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/products?category=${category.id}`)}
              title="View products in this category"
              className="text-muted-foreground hover:text-primary"
            >
              <Package className="w-4 h-4 mr-1" />
              {category.product_count || 0}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openCreateDialog(category.id)}
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDialog(category)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialog({ open: true, category })}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child: any) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Manage hierarchical product categories
          </p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Category Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Category Tree
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : categoryTree?.length === 0 ? (
            <div className="p-8 text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No categories yet</p>
              <Button onClick={() => openCreateDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Category
              </Button>
            </div>
          ) : (
            <div>{categoryTree?.map((cat: any) => renderCategory(cat))}</div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog - Using Reusable Component */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCategory={editingCategory}
        defaultParentId={defaultParentId}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, category: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.category?.name}"? 
              This will also affect any products in this category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, category: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteDialog.category.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

