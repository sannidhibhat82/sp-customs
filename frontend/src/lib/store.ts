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

// Order Item for creating orders
export interface OrderItemData {
  productId: number;
  variantId?: number;
  productName: string;
  productSku: string;
  productBarcode?: string;
  variantName?: string;
  variantOptions?: Record<string, any>;
  unitPrice: number;
  quantity: number;
  discount: number;
  productImage?: string;
  availableQuantity: number;
}

// Shipping Info
export interface ShippingInfoData {
  customer_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  landmark: string;
  delivery_instructions: string;
}

interface OrderState {
  items: OrderItemData[];
  shippingInfo: ShippingInfoData;
  paymentInfo: {
    method: string;
    status: string;
  };
  notes: string;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  addItem: (item: OrderItemData) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateItemQuantity: (productId: number, quantity: number, variantId?: number) => void;
  setShippingInfo: (info: Partial<ShippingInfoData>) => void;
  setPaymentInfo: (info: { method?: string; status?: string }) => void;
  setNotes: (notes: string) => void;
  setDiscountAmount: (amount: number) => void;
  setShippingCost: (cost: number) => void;
  setTaxAmount: (amount: number) => void;
  clearOrder: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

const defaultShippingInfo: ShippingInfoData = {
  customer_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  landmark: '',
  delivery_instructions: '',
};

export const useOrderStore = create<OrderState>((set, get) => ({
  items: [],
  shippingInfo: defaultShippingInfo,
  paymentInfo: {
    method: 'cash',
    status: 'pending',
  },
  notes: '',
  discountAmount: 0,
  shippingCost: 0,
  taxAmount: 0,
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId && i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (productId, variantId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      ),
    })),
  updateItemQuantity: (productId, quantity, variantId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity }
          : i
      ),
    })),
  setShippingInfo: (info) =>
    set((state) => ({
      shippingInfo: { ...state.shippingInfo, ...info },
    })),
  setPaymentInfo: (info) =>
    set((state) => ({
      paymentInfo: { ...state.paymentInfo, ...info },
    })),
  setNotes: (notes) => set({ notes }),
  setDiscountAmount: (amount) => set({ discountAmount: amount }),
  setShippingCost: (cost) => set({ shippingCost: cost }),
  setTaxAmount: (amount) => set({ taxAmount: amount }),
  clearOrder: () =>
    set({
      items: [],
      shippingInfo: defaultShippingInfo,
      paymentInfo: { method: 'cash', status: 'pending' },
      notes: '',
      discountAmount: 0,
      shippingCost: 0,
      taxAmount: 0,
    }),
  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + (item.unitPrice * item.quantity) - item.discount,
      0
    );
  },
  getTotal: () => {
    const { items, discountAmount, shippingCost, taxAmount } = get();
    const subtotal = items.reduce(
      (total, item) => total + (item.unitPrice * item.quantity) - item.discount,
      0
    );
    return subtotal - discountAmount + shippingCost + taxAmount;
  },
}));