'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Image,
  Megaphone,
  Star,
  Instagram,
  Tag,
  MessageSquare,
  Mail,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
  Check,
  X,
  Clock,
  Percent,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Tab definitions
const tabs = [
  { id: 'banners', label: 'Promo Banners', icon: Megaphone },
  { id: 'testimonials', label: 'Testimonials', icon: Star },
  { id: 'reels', label: 'Instagram Reels', icon: Instagram },
  { id: 'deals', label: 'Deal of Day', icon: Tag },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'contacts', label: 'Contact Forms', icon: MessageSquare },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
];

// Gradient options for selection with actual color values for inline styles
const gradientOptions = [
  { from: 'orange-600', to: 'red-600', label: 'Orange-Red', fromColor: '#ea580c', toColor: '#dc2626' },
  { from: 'blue-600', to: 'purple-600', label: 'Blue-Purple', fromColor: '#2563eb', toColor: '#9333ea' },
  { from: 'green-600', to: 'teal-600', label: 'Green-Teal', fromColor: '#16a34a', toColor: '#0d9488' },
  { from: 'rose-500', to: 'pink-600', label: 'Rose-Pink', fromColor: '#f43f5e', toColor: '#db2777' },
  { from: 'violet-500', to: 'purple-600', label: 'Violet-Purple', fromColor: '#8b5cf6', toColor: '#9333ea' },
  { from: 'emerald-500', to: 'teal-600', label: 'Emerald-Teal', fromColor: '#10b981', toColor: '#0d9488' },
  { from: 'amber-500', to: 'orange-600', label: 'Amber-Orange', fromColor: '#f59e0b', toColor: '#ea580c' },
  { from: 'cyan-500', to: 'blue-600', label: 'Cyan-Blue', fromColor: '#06b6d4', toColor: '#2563eb' },
];

export default function HomepageAdminPage() {
  const [activeTab, setActiveTab] = useState('banners');
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homepage Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional banners, testimonials, deals, and more
          </p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview Homepage
          </Button>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'banners' && <BannersTab />}
          {activeTab === 'testimonials' && <TestimonialsTab />}
          {activeTab === 'reels' && <ReelsTab />}
          {activeTab === 'deals' && <DealsTab />}
          {activeTab === 'faqs' && <FAQsTab />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'newsletter' && <NewsletterTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============ Banners Tab ============
function BannersTab() {
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(gradientOptions[0]);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.getPromoBanners(),
  });

  const openForm = (banner: any = null) => {
    setEditingBanner(banner);
    setShowForm(true);
    if (banner) {
      const found = gradientOptions.find(g => g.from === banner.gradient_from);
      setSelectedGradient(found || gradientOptions[0]);
    } else {
      setSelectedGradient(gradientOptions[0]);
    }
  };

  const createMutation = useMutation({
    mutationFn: api.createPromoBanner.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'Banner created successfully' });
      setShowForm(false);
      setEditingBanner(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error creating banner', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updatePromoBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'Banner updated successfully' });
      setShowForm(false);
      setEditingBanner(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error updating banner', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePromoBanner.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast({ title: 'Banner deleted successfully' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      subtitle: formData.get('subtitle') as string || undefined,
      description: formData.get('description') as string || undefined,
      cta_text: formData.get('cta_text') as string || 'Shop Now',
      cta_link: formData.get('cta_link') as string || '/products',
      gradient_from: selectedGradient.from,
      gradient_to: selectedGradient.to,
      is_active: formData.get('is_active') === 'on',
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
    };

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Get gradient colors for preview
  const getGradientStyle = (from: string, to: string) => {
    const opt = gradientOptions.find(g => g.from === from);
    if (opt) {
      return { background: `linear-gradient(to right, ${opt.fromColor}, ${opt.toColor})` };
    }
    return { background: 'linear-gradient(to right, #ea580c, #dc2626)' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Promotional Banners</h2>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Banner
        </Button>
      </div>

      {/* Banner List */}
      <div className="grid gap-4">
        {banners.map((banner: any) => (
          <div
            key={banner.id}
            className={cn(
              "bg-card border rounded-xl p-4 flex items-center gap-4",
              !banner.is_active && "opacity-60"
            )}
          >
            {/* Preview */}
            <div 
              className="w-24 h-16 rounded-lg flex-shrink-0"
              style={getGradientStyle(banner.gradient_from, banner.gradient_to)}
            />
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{banner.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
            </div>

            {/* Status */}
            <div className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              banner.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
            )}>
              {banner.is_active ? 'Active' : 'Inactive'}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openForm(banner)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-400"
                onClick={() => {
                  if (confirm('Delete this banner?')) {
                    deleteMutation.mutate(banner.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No banners yet. Click "Add Banner" to create one.
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingBanner ? 'Edit Banner' : 'Add New Banner'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input name="title" defaultValue={editingBanner?.title} required />
              </div>
              <div>
                <label className="text-sm font-medium">Subtitle</label>
                <Input name="subtitle" defaultValue={editingBanner?.subtitle} placeholder="e.g., Up to 40% Off" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input name="description" defaultValue={editingBanner?.description} placeholder="On all car accessories" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CTA Text</label>
                  <Input name="cta_text" defaultValue={editingBanner?.cta_text || 'Shop Now'} />
                </div>
                <div>
                  <label className="text-sm font-medium">CTA Link</label>
                  <Input name="cta_link" defaultValue={editingBanner?.cta_link || '/products'} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Gradient Colors</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {gradientOptions.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSelectedGradient(opt)}
                      className={cn(
                        "h-10 rounded-lg border-2 transition-all",
                        selectedGradient.from === opt.from 
                          ? "border-white ring-2 ring-white/50 scale-105" 
                          : "border-transparent hover:border-white/50"
                      )}
                      style={{ background: `linear-gradient(to right, ${opt.fromColor}, ${opt.toColor})` }}
                      title={opt.label}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Selected: {selectedGradient.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sort Order</label>
                  <Input type="number" name="sort_order" defaultValue={editingBanner?.sort_order || 0} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    defaultChecked={editingBanner?.is_active ?? true}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingBanner(null); setSelectedGradient(gradientOptions[0]); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingBanner ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============ Testimonials Tab ============
function TestimonialsTab() {
  const queryClient = useQueryClient();
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: () => api.getTestimonials(),
  });

  const createMutation = useMutation({
    mutationFn: api.createTestimonial.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      toast({ title: 'Testimonial created successfully' });
      setShowForm(false);
      setEditingTestimonial(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateTestimonial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      toast({ title: 'Testimonial updated successfully' });
      setShowForm(false);
      setEditingTestimonial(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTestimonial.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      toast({ title: 'Testimonial deleted successfully' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customer_name: formData.get('customer_name') as string,
      customer_role: formData.get('customer_role') as string || undefined,
      rating: parseInt(formData.get('rating') as string) || 5,
      review_text: formData.get('review_text') as string,
      is_featured: formData.get('is_featured') === 'on',
      is_active: formData.get('is_active') === 'on',
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
    };

    if (editingTestimonial) {
      updateMutation.mutate({ id: editingTestimonial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Customer Testimonials</h2>
        <Button onClick={() => { setEditingTestimonial(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Testimonial
        </Button>
      </div>

      {/* Testimonials List */}
      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.map((testimonial: any) => (
          <div
            key={testimonial.id}
            className={cn(
              "bg-card border rounded-xl p-4",
              !testimonial.is_active && "opacity-60"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                {testimonial.customer_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{testimonial.customer_name}</h3>
                  {testimonial.is_featured && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">Featured</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{testimonial.customer_role}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < testimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingTestimonial(testimonial); setShowForm(true); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => {
                    if (confirm('Delete this testimonial?')) {
                      deleteMutation.mutate(testimonial.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 line-clamp-3">"{testimonial.review_text}"</p>
          </div>
        ))}

        {testimonials.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No testimonials yet. Click "Add Testimonial" to create one.
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-lg"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input name="customer_name" defaultValue={editingTestimonial?.customer_name} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Role / Title</label>
                  <Input name="customer_role" defaultValue={editingTestimonial?.customer_role} placeholder="e.g., BMW Owner" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Rating</label>
                <select
                  name="rating"
                  defaultValue={editingTestimonial?.rating || 5}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} Stars</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Review Text *</label>
                <textarea
                  name="review_text"
                  defaultValue={editingTestimonial?.review_text}
                  required
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_featured" id="is_featured" defaultChecked={editingTestimonial?.is_featured} className="w-4 h-4" />
                  <label htmlFor="is_featured" className="text-sm">Featured</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_active" id="is_active_test" defaultChecked={editingTestimonial?.is_active ?? true} className="w-4 h-4" />
                  <label htmlFor="is_active_test" className="text-sm">Active</label>
                </div>
              </div>
              <input type="hidden" name="sort_order" value={editingTestimonial?.sort_order || 0} />
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingTestimonial(null); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTestimonial ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============ Reels Tab ============
function ReelsTab() {
  const queryClient = useQueryClient();
  const [editingReel, setEditingReel] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailData, setThumbnailData] = useState<string | null>(null);

  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['admin-reels'],
    queryFn: () => api.getInstagramReels(),
  });

  const createMutation = useMutation({
    mutationFn: api.createInstagramReel.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
      toast({ title: 'Reel created successfully' });
      setShowForm(false);
      setEditingReel(null);
      setThumbnailPreview(null);
      setThumbnailData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateInstagramReel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
      toast({ title: 'Reel updated successfully' });
      setShowForm(false);
      setEditingReel(null);
      setThumbnailPreview(null);
      setThumbnailData(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteInstagramReel.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
      toast({ title: 'Reel deleted successfully' });
    },
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setThumbnailPreview(base64);
        // Remove the data URL prefix for storage
        setThumbnailData(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      instagram_url: formData.get('instagram_url') as string || undefined,
      thumbnail_data: thumbnailData || editingReel?.thumbnail_data || undefined,
      views_count: formData.get('views_count') as string || undefined,
      is_active: formData.get('is_active') === 'on',
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
    };

    if (editingReel) {
      updateMutation.mutate({ id: editingReel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openForm = (reel: any = null) => {
    setEditingReel(reel);
    setShowForm(true);
    if (reel?.thumbnail_data) {
      const prefix = reel.thumbnail_data.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,';
      setThumbnailPreview(prefix + reel.thumbnail_data);
      setThumbnailData(reel.thumbnail_data);
    } else {
      setThumbnailPreview(null);
      setThumbnailData(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Instagram Reels</h2>
          <p className="text-sm text-muted-foreground">Add reel thumbnails that link to Instagram</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Reel
        </Button>
      </div>

      {/* Reels Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {reels.map((reel: any) => (
          <div
            key={reel.id}
            className={cn(
              "bg-card border rounded-xl overflow-hidden group",
              !reel.is_active && "opacity-60"
            )}
          >
            <div className="relative aspect-[9/16]">
              {reel.thumbnail_data ? (
                <img
                  src={reel.thumbnail_data.startsWith('data:') ? reel.thumbnail_data : 
                       reel.thumbnail_data.startsWith('/9j/') ? `data:image/jpeg;base64,${reel.thumbnail_data}` : 
                       `data:image/png;base64,${reel.thumbnail_data}`}
                  alt={reel.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openForm(reel)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this reel?')) {
                      deleteMutation.mutate(reel.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{reel.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{reel.views_count || 'No views count'}</p>
              <div className={cn(
                "mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium",
                reel.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
              )}>
                {reel.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        ))}

        {reels.length === 0 && (
          <div className="col-span-4 text-center py-12 text-muted-foreground">
            No reels yet. Click "Add Reel" to create one.
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingReel ? 'Edit Reel' : 'Add New Reel'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Thumbnail Upload */}
              <div>
                <label className="text-sm font-medium block mb-2">Thumbnail Image *</label>
                <div className="flex gap-4">
                  <div className="relative w-24 h-40 rounded-lg overflow-hidden border-2 border-dashed border-border bg-secondary/50 flex-shrink-0">
                    {thumbnailPreview ? (
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Image className="w-6 h-6 mb-1" />
                        <span className="text-xs">9:16</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot or thumbnail from your Instagram reel. Best size: 1080x1920 (9:16 ratio)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input name="title" defaultValue={editingReel?.title} required placeholder="e.g., Dash Cam Installation" />
              </div>

              <div>
                <label className="text-sm font-medium">Instagram Reel URL *</label>
                <Input 
                  name="instagram_url" 
                  defaultValue={editingReel?.instagram_url} 
                  required
                  placeholder="https://www.instagram.com/reel/..." 
                />
                <p className="text-xs text-muted-foreground mt-1">Copy link from Instagram reel share button</p>
              </div>

              <div>
                <label className="text-sm font-medium">Views Count</label>
                <Input name="views_count" defaultValue={editingReel?.views_count} placeholder="e.g., 12.5K" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_active" id="is_active_reel" defaultChecked={editingReel?.is_active ?? true} className="w-4 h-4" />
                <label htmlFor="is_active_reel" className="text-sm">Active (visible on homepage)</label>
              </div>

              <input type="hidden" name="sort_order" value={editingReel?.sort_order || reels.length} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingReel(null); setThumbnailPreview(null); setThumbnailData(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingReel ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============ Deals Tab ============
function DealsTab() {
  const queryClient = useQueryClient();
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['admin-deals'],
    queryFn: () => api.getDeals(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-deal'],
    queryFn: async () => {
      const result = await api.getProducts({ is_active: true, page_size: 100 });
      return result.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createDeal.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast({ title: 'Deal created successfully' });
      setShowForm(false);
      setEditingDeal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast({ title: 'Deal updated successfully' });
      setShowForm(false);
      setEditingDeal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteDeal.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast({ title: 'Deal deleted successfully' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      product_id: parseInt(formData.get('product_id') as string) || undefined,
      title: formData.get('title') as string || 'Deal of the Day',
      description: formData.get('description') as string || undefined,
      discount_percentage: parseInt(formData.get('discount_percentage') as string) || 0,
      deal_price: parseFloat(formData.get('deal_price') as string) || undefined,
      original_price: parseFloat(formData.get('original_price') as string) || undefined,
      end_time: formData.get('end_time') ? new Date(formData.get('end_time') as string).toISOString() : undefined,
      is_active: formData.get('is_active') === 'on',
    };

    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Deal of the Day</h2>
        <Button onClick={() => { setEditingDeal(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Deal
        </Button>
      </div>

      {/* Deals List */}
      <div className="grid gap-4">
        {deals.map((deal: any) => (
          <div
            key={deal.id}
            className={cn(
              "bg-card border rounded-xl p-4 flex items-center gap-4",
              !deal.is_active && "opacity-60"
            )}
          >
            <div className="w-16 h-16 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Percent className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{deal.title}</h3>
              <p className="text-sm text-muted-foreground">
                {deal.product?.name || 'No product selected'}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg font-bold text-green-500">₹{deal.deal_price || 0}</span>
                {deal.original_price && (
                  <span className="text-sm text-muted-foreground line-through">₹{deal.original_price}</span>
                )}
                {deal.discount_percentage > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs font-medium rounded">
                    {deal.discount_percentage}% OFF
                  </span>
                )}
              </div>
            </div>
            <div className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              deal.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
            )}>
              {deal.is_active ? 'Active' : 'Inactive'}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingDeal(deal); setShowForm(true); }}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => {
                  if (confirm('Delete this deal?')) {
                    deleteMutation.mutate(deal.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {deals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No deals yet. Click "Add Deal" to create one.
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-lg"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingDeal ? 'Edit Deal' : 'Add New Deal'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Product</label>
                <select
                  name="product_id"
                  defaultValue={editingDeal?.product_id || ''}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">-- Select a product --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input name="title" defaultValue={editingDeal?.title || 'Deal of the Day'} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input name="description" defaultValue={editingDeal?.description} placeholder="Limited time offer!" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Deal Price</label>
                  <Input type="number" step="0.01" name="deal_price" defaultValue={editingDeal?.deal_price} />
                </div>
                <div>
                  <label className="text-sm font-medium">Original Price</label>
                  <Input type="number" step="0.01" name="original_price" defaultValue={editingDeal?.original_price} />
                </div>
                <div>
                  <label className="text-sm font-medium">Discount %</label>
                  <Input type="number" name="discount_percentage" defaultValue={editingDeal?.discount_percentage || 0} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="datetime-local"
                  name="end_time"
                  defaultValue={editingDeal?.end_time ? new Date(editingDeal.end_time).toISOString().slice(0, 16) : ''}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_active" id="is_active_deal" defaultChecked={editingDeal?.is_active ?? true} className="w-4 h-4" />
                <label htmlFor="is_active_deal" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingDeal(null); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDeal ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============ Contacts Tab ============
function ContactsTab() {
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: () => api.getContactSubmissions(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateContactSubmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      toast({ title: 'Status updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteContactSubmission.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      toast({ title: 'Contact deleted' });
    },
  });

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-500',
    read: 'bg-yellow-500/20 text-yellow-500',
    replied: 'bg-green-500/20 text-green-500',
    closed: 'bg-muted text-muted-foreground',
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contact Form Submissions</h2>
        <span className="text-sm text-muted-foreground">{contacts.length} submissions</span>
      </div>

      <div className="space-y-4">
        {contacts.map((contact: any) => (
          <div key={contact.id} className="bg-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{contact.name}</h3>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusColors[contact.status] || statusColors.new)}>
                    {contact.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{contact.email} {contact.phone && `• ${contact.phone}`}</p>
                {contact.subject && <p className="text-sm font-medium mt-2">{contact.subject}</p>}
                <p className="text-sm text-muted-foreground mt-1">{contact.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(contact.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  value={contact.status}
                  onChange={(e) => updateMutation.mutate({ id: contact.id, data: { status: e.target.value } })}
                  className="h-8 px-2 text-xs rounded border border-input bg-background"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => {
                    if (confirm('Delete this submission?')) {
                      deleteMutation.mutate(contact.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {contacts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No contact submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Newsletter Tab ============
function NewsletterTab() {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-newsletter'],
    queryFn: () => api.getNewsletterSubscriptions(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Newsletter Subscriptions</h2>
        <span className="text-sm text-muted-foreground">{subscriptions.filter((s: any) => s.is_active).length} active subscribers</span>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscriptions.map((sub: any) => (
              <tr key={sub.id}>
                <td className="px-4 py-3 text-sm">{sub.email}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{sub.name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    sub.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {sub.is_active ? 'Active' : 'Unsubscribed'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(sub.subscribed_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscriptions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No newsletter subscriptions yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ FAQs Tab ============
function FAQsTab() {
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-faq-categories'],
    queryFn: () => api.getFAQs(), // This gets categories with questions
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: api.createFAQCategory.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Category created successfully' });
      setShowCategoryForm(false);
      setEditingCategory(null);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateFAQCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Category updated successfully' });
      setShowCategoryForm(false);
      setEditingCategory(null);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteFAQCategory.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Category deleted successfully' });
    },
  });

  // Question mutations
  const createQuestionMutation = useMutation({
    mutationFn: api.createFAQQuestion.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Question created successfully' });
      setShowQuestionForm(false);
      setEditingQuestion(null);
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateFAQQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Question updated successfully' });
      setShowQuestionForm(false);
      setEditingQuestion(null);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: api.deleteFAQQuestion.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq-categories'] });
      toast({ title: 'Question deleted successfully' });
    },
  });

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      icon: formData.get('icon') as string || undefined,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
      is_active: formData.get('is_active') === 'on',
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      category_id: parseInt(formData.get('category_id') as string),
      question: formData.get('question') as string,
      answer: formData.get('answer') as string,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
      is_active: formData.get('is_active') === 'on',
    };

    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createQuestionMutation.mutate(data);
    }
  };

  const openAddQuestion = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setEditingQuestion(null);
    setShowQuestionForm(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">FAQ Management</h2>
          <p className="text-sm text-muted-foreground">Manage FAQ categories and questions</p>
        </div>
        <Button onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {/* Categories with Questions */}
      <div className="space-y-4">
        {categories.map((category: any) => (
          <div key={category.id} className={cn("bg-card border rounded-xl overflow-hidden", !category.is_active && "opacity-60")}>
            {/* Category Header */}
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg">
                {category.icon || '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.questions?.length || 0} questions</p>
              </div>
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                category.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
              )}>
                {category.is_active ? 'Active' : 'Inactive'}
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openAddQuestion(category.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(category); setShowCategoryForm(true); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => {
                    if (confirm('Delete this category and all its questions?')) {
                      deleteCategoryMutation.mutate(category.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <ChevronDown className={cn("w-5 h-5 transition-transform", expandedCategory === category.id && "rotate-180")} />
            </div>

            {/* Questions List */}
            <AnimatePresence>
              {expandedCategory === category.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t divide-y divide-border">
                    {category.questions?.map((question: any) => (
                      <div key={question.id} className={cn("p-4 pl-16", !question.is_active && "opacity-50")}>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{question.question}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{question.answer}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingQuestion(question);
                                setSelectedCategoryId(category.id);
                                setShowQuestionForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => {
                                if (confirm('Delete this question?')) {
                                  deleteQuestionMutation.mutate(question.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!category.questions || category.questions.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        No questions yet. Click the + button to add one.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No FAQ categories yet. Click "Add Category" to create one.
          </div>
        )}
      </div>

      {/* Category Form Dialog */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add FAQ Category'}
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input name="name" defaultValue={editingCategory?.name} required placeholder="e.g., Orders & Payment" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input name="description" defaultValue={editingCategory?.description} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Icon (emoji)</label>
                  <Input name="icon" defaultValue={editingCategory?.icon} placeholder="e.g., 💳" />
                </div>
                <div>
                  <label className="text-sm font-medium">Sort Order</label>
                  <Input type="number" name="sort_order" defaultValue={editingCategory?.sort_order || 0} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_active" id="cat_is_active" defaultChecked={editingCategory?.is_active ?? true} className="w-4 h-4" />
                <label htmlFor="cat_is_active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Question Form Dialog */}
      {showQuestionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border rounded-2xl p-6 w-full max-w-lg"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingQuestion ? 'Edit Question' : 'Add FAQ Question'}
            </h3>
            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category *</label>
                <select
                  name="category_id"
                  defaultValue={editingQuestion?.category_id || selectedCategoryId || ''}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required
                >
                  <option value="">-- Select category --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Question *</label>
                <Input name="question" defaultValue={editingQuestion?.question} required placeholder="e.g., What payment methods do you accept?" />
              </div>
              <div>
                <label className="text-sm font-medium">Answer *</label>
                <textarea
                  name="answer"
                  defaultValue={editingQuestion?.answer}
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  placeholder="The answer to the question..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sort Order</label>
                  <Input type="number" name="sort_order" defaultValue={editingQuestion?.sort_order || 0} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" name="is_active" id="q_is_active" defaultChecked={editingQuestion?.is_active ?? true} className="w-4 h-4" />
                  <label htmlFor="q_is_active" className="text-sm">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); setSelectedCategoryId(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}>
                  {editingQuestion ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
