import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true', // Bypass localtunnel password page
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sp_customs_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sp_customs_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sp_customs_token');
    }
  }

  // Auth
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login/json', { username, password });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Categories
  async getCategories(params?: { parent_id?: number; is_active?: boolean }) {
    const response = await this.client.get('/categories', { params });
    return response.data;
  }

  async getCategoryTree(isActive?: boolean) {
    const response = await this.client.get('/categories/tree', { params: { is_active: isActive } });
    return response.data;
  }

  async getCategory(id: number) {
    const response = await this.client.get(`/categories/${id}`);
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/categories', data);
    return response.data;
  }

  async updateCategory(id: number, data: any) {
    const response = await this.client.put(`/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: number) {
    const response = await this.client.delete(`/categories/${id}`);
    return response.data;
  }

  // Brands
  async getBrands(params?: { is_active?: boolean; category_id?: number }) {
    const response = await this.client.get('/brands', { params });
    return response.data;
  }

  async getBrand(id: number) {
    const response = await this.client.get(`/brands/${id}`);
    return response.data;
  }

  async createBrand(data: any) {
    const response = await this.client.post('/brands', data);
    return response.data;
  }

  async updateBrand(id: number, data: any) {
    const response = await this.client.put(`/brands/${id}`, data);
    return response.data;
  }

  async deleteBrand(id: number) {
    const response = await this.client.delete(`/brands/${id}`);
    return response.data;
  }

  // Products
  async getProducts(params?: {
    page?: number;
    page_size?: number;
    category_id?: number;
    brand_id?: number;
    is_active?: boolean;
    is_featured?: boolean;
    in_stock?: boolean;
    search?: string;
    tags?: string;  // Comma-separated tags for filtering
    visibility?: string;  // Filter by visibility (admin use)
    include_hidden?: boolean;  // Include hidden products (admin only)
    sort_by?: string;
    sort_order?: string;
  }) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async searchProducts(q: string, limit?: number, includeVariants: boolean = true) {
    const response = await this.client.get('/products/search', { 
      params: { q, limit, include_variants: includeVariants } 
    });
    return response.data;
  }

  async getProductByBarcode(barcode: string) {
    const response = await this.client.get(`/products/by-barcode/${barcode}`);
    return response.data;
  }

  async getProduct(id: number) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(id: number, data: any) {
    const response = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: number) {
    const response = await this.client.delete(`/products/${id}`);
    return response.data;
  }

  // Attributes
  async getAttributes(params?: { is_filterable?: boolean }) {
    const response = await this.client.get('/attributes', { params });
    return response.data;
  }

  async createAttribute(data: any) {
    const response = await this.client.post('/attributes', data);
    return response.data;
  }

  async updateAttribute(id: number, data: any) {
    const response = await this.client.put(`/attributes/${id}`, data);
    return response.data;
  }

  async deleteAttribute(id: number) {
    const response = await this.client.delete(`/attributes/${id}`);
    return response.data;
  }

  // Inventory
  async getInventory(params?: { low_stock?: boolean; out_of_stock?: boolean }) {
    const response = await this.client.get('/inventory', { params });
    return response.data;
  }

  async getInventoryStats() {
    const response = await this.client.get('/inventory/stats');
    return response.data;
  }

  async getProductInventory(productId: number) {
    const response = await this.client.get(`/inventory/${productId}`);
    return response.data;
  }

  async updateInventory(productId: number, data: any) {
    const response = await this.client.put(`/inventory/${productId}`, data);
    return response.data;
  }

  async scanInventory(data: {
    product_id?: number;
    barcode?: string;
    action: 'scan_in' | 'scan_out';
    quantity?: number;
    reason?: string;
    device_type?: string;
  }) {
    const response = await this.client.post('/inventory/scan', data);
    return response.data;
  }

  async getInventoryLogs(productId: number, limit?: number) {
    const response = await this.client.get(`/inventory/${productId}/logs`, { params: { limit } });
    return response.data;
  }

  async getVariantInventoryLogs(variantId: number, limit?: number) {
    const response = await this.client.get(`/inventory/variant/${variantId}/logs`, { params: { limit } });
    return response.data;
  }

  // Images
  async getProductImages(productId: number) {
    const response = await this.client.get(`/images/product/${productId}`);
    return response.data;
  }

  async uploadProductImage(productId: number, data: {
    filename: string;
    content_type: string;
    image_data: string;
    alt_text?: string;
    is_primary?: boolean;
  }) {
    const response = await this.client.post(`/images/product/${productId}`, data);
    return response.data;
  }

  async uploadProductImageFile(productId: number, file: File, isPrimary: boolean = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_primary', String(isPrimary));
    
    const response = await this.client.post(`/images/product/${productId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteProductImage(productId: number, imageId: number) {
    const response = await this.client.delete(`/images/product/${productId}/${imageId}`);
    return response.data;
  }

  async setProductPrimaryImage(productId: number, imageId: number) {
    const response = await this.client.put(`/images/product/${productId}/${imageId}/primary`);
    return response.data;
  }

  async updateImage(imageId: number, data: { alt_text?: string; is_primary?: boolean; sort_order?: number }) {
    const response = await this.client.put(`/images/${imageId}`, null, { params: data });
    return response.data;
  }

  async deleteImage(imageId: number) {
    const response = await this.client.delete(`/images/${imageId}`);
    return response.data;
  }

  // Variants
  async getProductVariants(productId: number) {
    const response = await this.client.get(`/variants/product/${productId}`);
    return response.data;
  }

  async getVariant(variantId: number) {
    const response = await this.client.get(`/variants/${variantId}`);
    return response.data;
  }

  async getVariantBarcodeImage(variantId: number) {
    const response = await this.client.get(`/variants/${variantId}/barcode-image`);
    return response.data;
  }

  async createVariant(productId: number, data: {
    name: string;
    sku?: string;
    barcode?: string;
    options: Record<string, string>;
    price?: number;
    cost_price?: number;
    compare_at_price?: number;
    is_active?: boolean;
    is_default?: boolean;
    sort_order?: number;
    initial_quantity?: number;
  }) {
    const response = await this.client.post(`/variants/product/${productId}`, data);
    return response.data;
  }

  async updateVariant(variantId: number, data: {
    name?: string;
    sku?: string;
    barcode?: string;
    options?: Record<string, string>;
    price?: number;
    cost_price?: number;
    compare_at_price?: number;
    is_active?: boolean;
    is_default?: boolean;
    sort_order?: number;
  }) {
    const response = await this.client.put(`/variants/${variantId}`, data);
    return response.data;
  }

  async deleteVariant(variantId: number) {
    const response = await this.client.delete(`/variants/${variantId}`);
    return response.data;
  }

  async uploadVariantImage(variantId: number, data: {
    filename: string;
    content_type: string;
    image_data: string;
    alt_text?: string;
    is_primary?: boolean;
  }) {
    const response = await this.client.post(`/variants/${variantId}/images`, data);
    return response.data;
  }

  async deleteVariantImage(variantId: number, imageId: number) {
    const response = await this.client.delete(`/variants/${variantId}/images/${imageId}`);
    return response.data;
  }

  async updateVariantInventory(variantId: number, quantity: number, adjustmentType: 'set' | 'add' | 'remove' = 'set') {
    const response = await this.client.put(`/variants/${variantId}/inventory`, null, {
      params: { quantity, adjustment_type: adjustmentType }
    });
    return response.data;
  }

  // Variant Options (Templates)
  async getVariantOptions() {
    const response = await this.client.get('/variants/options/');
    return response.data;
  }

  async createVariantOption(data: {
    name: string;
    values: string[];
    display_type?: string;
    sort_order?: number;
  }) {
    const response = await this.client.post('/variants/options/', data);
    return response.data;
  }

  async updateVariantOption(optionId: number, data: {
    name?: string;
    values?: string[];
    display_type?: string;
    sort_order?: number;
  }) {
    const response = await this.client.put(`/variants/options/${optionId}`, data);
    return response.data;
  }

  async deleteVariantOption(optionId: number) {
    const response = await this.client.delete(`/variants/options/${optionId}`);
    return response.data;
  }

  // ============ Homepage Content ============

  // Get all public homepage content
  async getHomepageContent() {
    const response = await this.client.get('/homepage/content');
    return response.data;
  }

  // Get FAQs (public)
  async getFAQs() {
    const response = await this.client.get('/homepage/faqs');
    return response.data;
  }

  // FAQ Categories (admin)
  async getFAQCategories() {
    const response = await this.client.get('/homepage/faq-categories');
    return response.data;
  }

  async createFAQCategory(data: any) {
    const response = await this.client.post('/homepage/faq-categories', data);
    return response.data;
  }

  async updateFAQCategory(id: number, data: any) {
    const response = await this.client.put(`/homepage/faq-categories/${id}`, data);
    return response.data;
  }

  async deleteFAQCategory(id: number) {
    const response = await this.client.delete(`/homepage/faq-categories/${id}`);
    return response.data;
  }

  // FAQ Questions (admin)
  async getFAQQuestions(categoryId?: number) {
    const response = await this.client.get('/homepage/faq-questions', {
      params: categoryId ? { category_id: categoryId } : undefined
    });
    return response.data;
  }

  async createFAQQuestion(data: any) {
    const response = await this.client.post('/homepage/faq-questions', data);
    return response.data;
  }

  async updateFAQQuestion(id: number, data: any) {
    const response = await this.client.put(`/homepage/faq-questions/${id}`, data);
    return response.data;
  }

  async deleteFAQQuestion(id: number) {
    const response = await this.client.delete(`/homepage/faq-questions/${id}`);
    return response.data;
  }

  // Promo Banners
  async getPromoBanners(isActive?: boolean) {
    const response = await this.client.get('/homepage/banners', {
      params: isActive !== undefined ? { is_active: isActive } : undefined
    });
    return response.data;
  }

  async getPromoBanner(id: number) {
    const response = await this.client.get(`/homepage/banners/${id}`);
    return response.data;
  }

  async createPromoBanner(data: {
    title: string;
    subtitle?: string;
    description?: string;
    cta_text?: string;
    cta_link?: string;
    gradient_from?: string;
    gradient_to?: string;
    image_data?: string;
    is_active?: boolean;
    sort_order?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await this.client.post('/homepage/banners', data);
    return response.data;
  }

  async updatePromoBanner(id: number, data: Partial<Parameters<typeof this.createPromoBanner>[0]>) {
    const response = await this.client.put(`/homepage/banners/${id}`, data);
    return response.data;
  }

  async deletePromoBanner(id: number) {
    const response = await this.client.delete(`/homepage/banners/${id}`);
    return response.data;
  }

  // Testimonials
  async getTestimonials(params?: { is_active?: boolean; is_featured?: boolean }) {
    const response = await this.client.get('/homepage/testimonials', { params });
    return response.data;
  }

  async getTestimonial(id: number) {
    const response = await this.client.get(`/homepage/testimonials/${id}`);
    return response.data;
  }

  async createTestimonial(data: {
    customer_name: string;
    customer_role?: string;
    customer_image?: string;
    rating?: number;
    review_text: string;
    product_id?: number;
    is_featured?: boolean;
    is_active?: boolean;
    sort_order?: number;
  }) {
    const response = await this.client.post('/homepage/testimonials', data);
    return response.data;
  }

  async updateTestimonial(id: number, data: Partial<Parameters<typeof this.createTestimonial>[0]>) {
    const response = await this.client.put(`/homepage/testimonials/${id}`, data);
    return response.data;
  }

  async deleteTestimonial(id: number) {
    const response = await this.client.delete(`/homepage/testimonials/${id}`);
    return response.data;
  }

  // Instagram Reels
  async getInstagramReels(isActive?: boolean) {
    const response = await this.client.get('/homepage/reels', {
      params: isActive !== undefined ? { is_active: isActive } : undefined
    });
    return response.data;
  }

  async getInstagramReel(id: number) {
    const response = await this.client.get(`/homepage/reels/${id}`);
    return response.data;
  }

  async createInstagramReel(data: {
    title: string;
    instagram_url?: string;
    embed_code?: string;
    thumbnail_data?: string;
    views_count?: string;
    icon_emoji?: string;
    gradient_from?: string;
    gradient_to?: string;
    is_active?: boolean;
    sort_order?: number;
  }) {
    const response = await this.client.post('/homepage/reels', data);
    return response.data;
  }

  async updateInstagramReel(id: number, data: Partial<Parameters<typeof this.createInstagramReel>[0]>) {
    const response = await this.client.put(`/homepage/reels/${id}`, data);
    return response.data;
  }

  async deleteInstagramReel(id: number) {
    const response = await this.client.delete(`/homepage/reels/${id}`);
    return response.data;
  }

  // Deal of the Day
  async getDeals() {
    const response = await this.client.get('/homepage/deals');
    return response.data;
  }

  async getActiveDeal() {
    const response = await this.client.get('/homepage/deals/active');
    return response.data;
  }

  async createDeal(data: {
    product_id?: number;
    title?: string;
    description?: string;
    discount_percentage?: number;
    deal_price?: number;
    original_price?: number;
    end_time?: string;
    is_active?: boolean;
  }) {
    const response = await this.client.post('/homepage/deals', data);
    return response.data;
  }

  async updateDeal(id: number, data: Partial<Parameters<typeof this.createDeal>[0]>) {
    const response = await this.client.put(`/homepage/deals/${id}`, data);
    return response.data;
  }

  async deleteDeal(id: number) {
    const response = await this.client.delete(`/homepage/deals/${id}`);
    return response.data;
  }

  // Contact Submissions
  async getContactSubmissions(status?: string) {
    const response = await this.client.get('/homepage/contacts', {
      params: status ? { status } : undefined
    });
    return response.data;
  }

  async submitContact(data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    product_id?: number;
  }) {
    const response = await this.client.post('/homepage/contacts', data);
    return response.data;
  }

  async updateContactSubmission(id: number, data: { status?: string; notes?: string }) {
    const response = await this.client.put(`/homepage/contacts/${id}`, data);
    return response.data;
  }

  async deleteContactSubmission(id: number) {
    const response = await this.client.delete(`/homepage/contacts/${id}`);
    return response.data;
  }

  // Homepage Settings
  async getHomepageSettings() {
    const response = await this.client.get('/homepage/settings');
    return response.data;
  }

  async setHomepageSetting(data: {
    key: string;
    value?: string;
    value_json?: any;
    description?: string;
  }) {
    const response = await this.client.post('/homepage/settings', data);
    return response.data;
  }

  async deleteHomepageSetting(key: string) {
    const response = await this.client.delete(`/homepage/settings/${key}`);
    return response.data;
  }

  // Newsletter
  async subscribeNewsletter(data: { email: string; name?: string }) {
    const response = await this.client.post('/homepage/newsletter/subscribe', data);
    return response.data;
  }

  async getNewsletterSubscriptions() {
    const response = await this.client.get('/homepage/newsletter/subscriptions');
    return response.data;
  }

  async unsubscribeNewsletter(email: string) {
    const response = await this.client.post('/homepage/newsletter/unsubscribe', null, {
      params: { email }
    });
    return response.data;
  }

  // ============ Orders ============

  async getOrders(params?: { status?: string; page?: number; page_size?: number }) {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrderStats() {
    const response = await this.client.get('/orders/stats');
    return response.data;
  }

  async getOrder(orderId: number) {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  async createOrder(data: {
    items: Array<{
      product_id?: number;
      variant_id?: number;
      product_name: string;
      product_sku: string;
      product_barcode?: string;
      variant_name?: string;
      variant_options?: Record<string, any>;
      unit_price: number;
      quantity: number;
      discount?: number;
      product_image?: string;
      extra_data?: Record<string, any>;
    }>;
    shipping_info?: Record<string, any>;
    billing_info?: Record<string, any>;
    shipping_details?: Record<string, any>;
    payment_info?: Record<string, any>;
    invoice_data?: Record<string, any>;
    metadata?: Record<string, any>;
    discount_amount?: number;
    shipping_cost?: number;
    tax_amount?: number;
    internal_notes?: string;
    customer_notes?: string;
  }) {
    const response = await this.client.post('/orders', data);
    return response.data;
  }

  async updateOrder(orderId: number, data: {
    status?: string;
    shipping_info?: Record<string, any>;
    billing_info?: Record<string, any>;
    shipping_details?: Record<string, any>;
    payment_info?: Record<string, any>;
    invoice_data?: Record<string, any>;
    metadata?: Record<string, any>;
    discount_amount?: number;
    shipping_cost?: number;
    tax_amount?: number;
    internal_notes?: string;
    customer_notes?: string;
  }) {
    const response = await this.client.put(`/orders/${orderId}`, data);
    return response.data;
  }

  async deleteOrder(orderId: number) {
    const response = await this.client.delete(`/orders/${orderId}`);
    return response.data;
  }

  async scanProductForOrder(data: {
    barcode?: string;
    product_id?: number;
    variant_id?: number;
    quantity?: number;
  }) {
    const response = await this.client.post('/orders/scan', data);
    return response.data;
  }

  async updateOrderStatus(orderId: number, status: string) {
    const response = await this.client.post(`/orders/${orderId}/update-status`, null, {
      params: { status }
    });
    return response.data;
  }

  // ============ Direct Orders (Brand-shipped) ============

  async getDirectOrders(params?: { status?: string; page?: number; page_size?: number }) {
    const response = await this.client.get('/orders/direct', { params });
    return response.data;
  }

  async getDirectOrderStats() {
    const response = await this.client.get('/orders/direct/stats');
    return response.data;
  }

  async getDirectOrder(orderId: number) {
    const response = await this.client.get(`/orders/direct/${orderId}`);
    return response.data;
  }

  async createDirectOrder(data: {
    items: Array<{
      product_id?: number;
      variant_id?: number;
      product_name: string;
      product_sku?: string;
      variant_name?: string;
      variant_options?: Record<string, any>;
      quantity: number;
      unit_price?: number;
      extra_data?: Record<string, any>;
    }>;
    customer_info?: Record<string, any>;
    brand_name?: string;
    brand_id?: number;
    tracking_number?: string;
    carrier?: string;
    notes?: string;
    extra_data?: Record<string, any>;
    order_date?: string;
  }) {
    const response = await this.client.post('/orders/direct', data);
    return response.data;
  }

  async updateDirectOrder(orderId: number, data: {
    status?: string;
    customer_info?: Record<string, any>;
    brand_name?: string;
    brand_id?: number;
    tracking_number?: string;
    carrier?: string;
    notes?: string;
    extra_data?: Record<string, any>;
    order_date?: string;
  }) {
    const response = await this.client.put(`/orders/direct/${orderId}`, data);
    return response.data;
  }

  async deleteDirectOrder(orderId: number) {
    const response = await this.client.delete(`/orders/direct/${orderId}`);
    return response.data;
  }

  async updateDirectOrderStatus(orderId: number, status: string) {
    const response = await this.client.post(`/orders/direct/${orderId}/update-status`, null, {
      params: { status }
    });
    return response.data;
  }

}

export const api = new ApiClient();
export default api;

