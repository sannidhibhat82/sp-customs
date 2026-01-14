'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Tags,
  Globe,
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
import { BrandDialog } from '@/components/dialogs';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn, getImageSrc } from '@/lib/utils';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; brand: any }>({
    open: false,
    brand: null,
  });

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand deleted', variant: 'success' });
      setDeleteDialog({ open: false, brand: null });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete brand',
        description: error.response?.data?.detail,
        variant: 'destructive',
      });
    },
  });

  const openCreateDialog = () => {
    setEditingBrand(null);
    setDialogOpen(true);
  };

  const openEditDialog = (brand: any) => {
    setEditingBrand(brand);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground">
            Manage product brands ({brands?.length || 0} total)
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {/* Brands Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="w-16 h-16 bg-secondary rounded-lg mb-4" />
                <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : brands?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tags className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No brands yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first brand</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Brand
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {brands?.map((brand: any, index: number) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="group hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => router.push(`/admin/products?brand=${brand.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                      brand.logo_data ? "bg-white" : "bg-primary/10"
                    )}>
                      {brand.logo_data ? (
                        <img
                          src={getImageSrc(brand.logo_data)}
                          alt={brand.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Tags className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
                        {brand.name}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {brand.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {brand.product_count || 0} products
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex gap-1">
                      {!brand.is_active && (
                        <span className="badge bg-muted text-muted-foreground">Inactive</span>
                      )}
                      {brand.is_featured && (
                        <span className="badge badge-info">Featured</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(brand); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, brand }); }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog - Using Reusable Component */}
      <BrandDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingBrand={editingBrand}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, brand: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.brand?.name}"?
              Products using this brand will have their brand removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, brand: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteDialog.brand.id)}
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

