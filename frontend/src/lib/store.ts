import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Public Site Theme (separate from admin)
type PublicThemeMode = 'dark' | 'light' | 'system';

interface PublicThemeState {
  theme: PublicThemeMode;
  setTheme: (theme: PublicThemeMode) => void;
}

export const usePublicThemeStore = create<PublicThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'sp-customs-public-theme',
    }
  )
);

interface User {
  id: number;
  uuid: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sp_customs_token');
        }
      },
    }),
    {
      name: 'sp-customs-auth',
    }
  )
);

type ThemeMode = 'dark' | 'light' | 'system';
type AccentColor = 'orange' | 'blue' | 'green' | 'purple' | 'red';

interface UIState {
  sidebarOpen: boolean;
  theme: ThemeMode;
  accentColor: AccentColor;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      accentColor: 'orange',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    {
      name: 'sp-customs-ui',
    }
  )
);

// Store Settings
interface StoreSettings {
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  currency: string;
  low_stock_threshold: number;
}

interface NotificationSettings {
  low_stock: boolean;
  new_orders: boolean;
  product_updates: boolean;
  security_alerts: boolean;
}

interface StoreSettingsState {
  storeSettings: StoreSettings;
  notifications: NotificationSettings;
  setStoreSettings: (settings: Partial<StoreSettings>) => void;
  setNotifications: (notifications: Partial<NotificationSettings>) => void;
}

export const useStoreSettingsStore = create<StoreSettingsState>()(
  persist(
    (set) => ({
      storeSettings: {
        store_name: 'SP Customs',
        store_email: 'contact@spcustoms.com',
        store_phone: '+91 98765 43210',
        store_address: 'Bangalore, Karnataka, India',
        currency: 'INR',
        low_stock_threshold: 10,
      },
      notifications: {
        low_stock: true,
        new_orders: true,
        product_updates: true,
        security_alerts: true,
      },
      setStoreSettings: (settings) =>
        set((state) => ({
          storeSettings: { ...state.storeSettings, ...settings },
        })),
      setNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),
    }),
    {
      name: 'sp-customs-store-settings',
    }
  )
);

interface ScanState {
  lastScanResult: any | null;
  scanHistory: any[];
  setLastScanResult: (result: any) => void;
  addToHistory: (result: any) => void;
  removeFromHistory: (index: number) => void;
  clearHistory: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  lastScanResult: null,
  scanHistory: [],
  setLastScanResult: (result) => set({ lastScanResult: result }),
  addToHistory: (result) =>
    set((state) => ({
      scanHistory: [result, ...state.scanHistory.slice(0, 49)],
    })),
  removeFromHistory: (index) =>
    set((state) => ({
      scanHistory: state.scanHistory.filter((_, i) => i !== index),
    })),
  clearHistory: () => set({ scanHistory: [] }),
}));

interface CartItem {
  productId: number;
  name: string;
  sku: string;
  price: number | null;
  quantity: number;
  image: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + (item.price || 0) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'sp-customs-cart',
    }
  )
);

