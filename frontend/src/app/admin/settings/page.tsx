'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Lock,
  Store,
  Bell,
  Palette,
  Save,
  Eye,
  EyeOff,
  Check,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore, useUIStore, useStoreSettingsStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const accentColors = [
  { id: 'orange', color: 'bg-orange-500', hsl: '24 95% 53%' },
  { id: 'blue', color: 'bg-blue-500', hsl: '217 91% 60%' },
  { id: 'green', color: 'bg-green-500', hsl: '142 71% 45%' },
  { id: 'purple', color: 'bg-purple-500', hsl: '271 91% 65%' },
  { id: 'red', color: 'bg-red-500', hsl: '0 84% 60%' },
] as const;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme, accentColor, setAccentColor } = useUIStore();
  const { 
    storeSettings, 
    setStoreSettings: updateStoreSettings, 
    notifications, 
    setNotifications: updateNotifications 
  } = useStoreSettingsStore();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form
  const [profile, setProfile] = useState({
    full_name: user?.full_name || 'SP Customs Admin',
    email: user?.email || 'admin@spcustoms.com',
  });

  // Password form
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Local form state for store settings (to allow editing before save)
  const [localStoreSettings, setLocalStoreSettings] = useState(storeSettings);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  
  // Sync local state when store changes
  useEffect(() => {
    setLocalStoreSettings(storeSettings);
  }, [storeSettings]);
  
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
      root.classList.toggle('light', !systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const accent = accentColors.find(c => c.id === accentColor);
    if (accent) {
      document.documentElement.style.setProperty('--primary', accent.hsl);
    }
  }, [accentColor]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'store', label: 'Store', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const handleSaveProfile = () => {
    toast({ title: 'Profile updated!', variant: 'success' });
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwords.new.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    toast({ title: 'Password changed successfully!', variant: 'success' });
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleSaveStore = () => {
    updateStoreSettings(localStoreSettings);
    toast({ title: 'Store settings saved!', variant: 'success' });
  };

  const handleSaveNotifications = () => {
    updateNotifications(localNotifications);
    toast({ title: 'Notification preferences saved!', variant: 'success' });
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    toast({ title: `Theme changed to ${newTheme}`, variant: 'success' });
  };

  const handleAccentChange = (color: typeof accentColor) => {
    setAccentColor(color);
    toast({ title: `Accent color changed`, variant: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and application settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user?.username || 'Admin'}</p>
                    <p className="text-sm text-muted-foreground">{user?.role || 'Administrator'}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Full Name</label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleChangePassword}>
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <Card>
              <CardHeader>
                <CardTitle>Store Settings</CardTitle>
                <CardDescription>Configure your store information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Store Name</label>
                    <Input
                      value={localStoreSettings.store_name}
                      onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, store_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Store Email</label>
                    <Input
                      type="email"
                      value={localStoreSettings.store_email}
                      onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, store_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number</label>
                    <Input
                      value={localStoreSettings.store_phone}
                      onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, store_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Currency</label>
                    <Input
                      value={localStoreSettings.currency}
                      onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, currency: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Store Address</label>
                  <textarea
                    value={localStoreSettings.store_address}
                    onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, store_address: e.target.value })}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Low Stock Threshold (Default)</label>
                  <Input
                    type="number"
                    min="0"
                    value={localStoreSettings.low_stock_threshold}
                    onChange={(e) => setLocalStoreSettings({ ...localStoreSettings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default threshold for new products. Each product can have its own threshold.
                  </p>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveStore}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'low_stock', label: 'Low stock alerts', description: 'Get notified when products are running low' },
                  { key: 'new_orders', label: 'New orders', description: 'Receive notifications for new orders' },
                  { key: 'product_updates', label: 'Product updates', description: 'Get notified about product changes' },
                  { key: 'security_alerts', label: 'Security alerts', description: 'Important security notifications' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={localNotifications[item.key as keyof typeof localNotifications]}
                        onChange={(e) => setLocalNotifications({ ...localNotifications, [item.key]: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}

                <div className="pt-4">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Theme</label>
                  <div className="flex gap-4">
                    {[
                      { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-zinc-900' },
                      { id: 'light', label: 'Light', icon: Sun, preview: 'bg-white border border-border' },
                      { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-zinc-900 to-white' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id as 'dark' | 'light' | 'system')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          theme === t.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn("w-16 h-10 rounded flex items-center justify-center", t.preview)}>
                          <t.icon className={cn("w-5 h-5", t.id === 'light' ? 'text-black' : 'text-white')} />
                        </div>
                        <span className="text-sm font-medium">{t.label}</span>
                        {theme === t.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Accent Color</label>
                  <div className="flex gap-3">
                    {accentColors.map((accent) => (
                      <button
                        key={accent.id}
                        onClick={() => handleAccentChange(accent.id)}
                        className={cn(
                          "w-12 h-12 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                          accent.color,
                          accentColor === accent.id && "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                        )}
                        title={accent.id.charAt(0).toUpperCase() + accent.id.slice(1)}
                      >
                        {accentColor === accent.id && <Check className="w-5 h-5 text-white" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Current: {accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
