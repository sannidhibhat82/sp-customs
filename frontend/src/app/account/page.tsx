'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Plus, Trash2, Star, User as UserIcon, Mail, Phone } from 'lucide-react';
import { Header, Footer } from '@/components/public';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

type Address = {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
};

export default function AccountPage() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!api.getToken()) router.replace('/');
  }, [router]);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
  });

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    if (!me) return;
    setProfile({
      full_name: me.full_name || '',
      email: me.email || '',
    });
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: () => api.updateMe({ full_name: profile.full_name, email: profile.email }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast({ title: 'Profile updated', variant: 'success' });
    },
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Failed to update profile', variant: 'destructive' }),
  });

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.listAddresses(),
  });

  const list = useMemo(() => (addresses as Address[]) ?? [], [addresses]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  const createMutation = useMutation({
    mutationFn: () => api.createAddress({ ...form, is_default: list.length === 0 }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      setForm({ name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India' });
      toast({ title: 'Address saved', variant: 'success' });
    },
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Failed to save address', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAddress(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Address deleted', variant: 'success' });
    },
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Failed to delete address', variant: 'destructive' }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.updateAddress(id, { is_default: true }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Default address updated', variant: 'success' });
    },
    onError: (err: any) => toast({ title: err.response?.data?.detail || 'Failed to update', variant: 'destructive' }),
  });

  if (!api.getToken()) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">My Account</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">My Account</h1>
          <div className="flex gap-2">
            <Link href="/account/orders">
              <Button variant="outline">My Orders</Button>
            </Link>
            <Link href="/account/favorites">
              <Button variant="outline">Favourites</Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </h2>
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                    <UserIcon className="w-3.5 h-3.5" />
                    Name
                  </label>
                  <Input
                    placeholder="Your name"
                    value={profile.full_name}
                    onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </label>
                  <Input
                    placeholder="Email (optional)"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    Phone
                  </label>
                  <Input value={me?.phone || ''} disabled />
                </div>
              </div>
              <Button
                className="w-full mt-5 h-11"
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </div>

            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Saved Addresses
            </h2>

            {isLoading ? (
              <div className="animate-pulse h-40 rounded-xl bg-secondary/30" />
            ) : list.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No saved addresses yet. Add one and it will be available during checkout.
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{a.name}</p>
                          {a.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.phone}</p>
                        <p className="text-sm mt-2">
                          {a.address}, {a.city}, {a.state} - {a.pincode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Set default"
                          onClick={() => setDefaultMutation.mutate(a.id)}
                          disabled={setDefaultMutation.isPending || a.is_default}
                        >
                          <Star className={a.is_default ? 'w-4 h-4 fill-current text-primary' : 'w-4 h-4'} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => deleteMutation.mutate(a.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add new address
            </h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <div className="sm:col-span-2">
                  <Input placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <Input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                <Input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                <Input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
                <Input placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <Button
                className="w-full mt-5 h-11"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()}
              >
                {createMutation.isPending ? 'Saving…' : 'Save address'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

