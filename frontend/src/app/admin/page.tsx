'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
  Layers,
  Tags,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Scan,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => api.getInventoryStats(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories({ is_active: true }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.getBrands({ is_active: true }),
  });

  const { data: recentProducts } = useQuery({
    queryKey: ['recent-products'],
    queryFn: () => api.getProducts({ page_size: 5, sort_by: 'created_at', sort_order: 'desc' }),
  });

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      href: '/admin/products',
    },
    {
      label: 'Categories',
      value: categories?.length || 0,
      icon: Layers,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      href: '/admin/categories',
    },
    {
      label: 'Brands',
      value: brands?.length || 0,
      icon: Tags,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      href: '/admin/brands',
    },
    {
      label: 'Low Stock',
      value: stats?.low_stock || 0,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      href: '/admin/inventory?filter=low_stock',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to SP Customs Admin</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/scanner">
            <Button variant="outline">
              <Scan className="w-4 h-4 mr-2" />
              Scanner
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={stat.href}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bgColor)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    View details
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stock Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Inventory Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In Stock</span>
                <span className="font-semibold text-green-400">{stats?.in_stock || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${((stats?.in_stock || 0) / (stats?.total_products || 1)) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Low Stock</span>
                <span className="font-semibold text-yellow-400">{stats?.low_stock || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${((stats?.low_stock || 0) / (stats?.total_products || 1)) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Out of Stock</span>
                <span className="font-semibold text-red-400">{stats?.out_of_stock || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${((stats?.out_of_stock || 0) / (stats?.total_products || 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/products/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Package className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
            </Link>
            <Link href="/admin/scanner" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Scan className="w-4 h-4 mr-2" />
                Scan Inventory
              </Button>
            </Link>
            <Link href="/admin/brands" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Tags className="w-4 h-4 mr-2" />
                Manage Brands
              </Button>
            </Link>
            <Link href="/admin/categories" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Layers className="w-4 h-4 mr-2" />
                Manage Categories
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Recent Products
          </CardTitle>
          <Link href="/admin/products">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProducts?.items?.map((product: any) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                  {product.primary_image ? (
                    <img
                      src={`data:image/jpeg;base64,${product.primary_image}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-medium",
                    product.is_in_stock ? "text-green-400" : "text-red-400"
                  )}>
                    {product.is_in_stock ? 'In Stock' : 'Out of Stock'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {product.inventory_quantity}
                  </p>
                </div>
              </Link>
            ))}

            {(!recentProducts?.items || recentProducts.items.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No products yet</p>
                <Link href="/admin/products/new">
                  <Button variant="link" className="mt-2">Add your first product</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

