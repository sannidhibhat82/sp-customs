-- Migration: Add Direct Orders table and Tags column to Products
-- Run this SQL on your production database to add the new features
-- Date: January 2026

-- 1. Add 'tags' column to products table (if it doesn't exist)
-- Tags are used for product search functionality (e.g., "bmw", "shift", "racing")
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create index on tags for faster search
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

-- 3. Create direct_orders table (for brand-shipped orders that don't affect inventory)
CREATE TABLE IF NOT EXISTS direct_orders (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    customer_info JSONB NOT NULL DEFAULT '{}',
    brand_name VARCHAR(255),
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    notes TEXT,
    extra_data JSONB NOT NULL DEFAULT '{}',
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for direct_orders
CREATE INDEX IF NOT EXISTS idx_direct_orders_uuid ON direct_orders(uuid);
CREATE INDEX IF NOT EXISTS idx_direct_orders_order_number ON direct_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_direct_orders_status ON direct_orders(status);
CREATE INDEX IF NOT EXISTS idx_direct_orders_order_date ON direct_orders(order_date);

-- 4. Create direct_order_items table
CREATE TABLE IF NOT EXISTS direct_order_items (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES direct_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(500) NOT NULL,
    product_sku VARCHAR(100),
    variant_name VARCHAR(255),
    variant_options JSONB NOT NULL DEFAULT '{}',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2),
    extra_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for direct_order_items
CREATE INDEX IF NOT EXISTS idx_direct_order_items_order_id ON direct_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_direct_order_items_uuid ON direct_order_items(uuid);

-- 5. Add index on visibility column for faster filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_visibility ON products(visibility);

-- Summary of changes:
-- - Added 'tags' JSONB column to products table for tag-based search
-- - Created 'direct_orders' table for brand-shipped orders
-- - Created 'direct_order_items' table for direct order line items
-- - Added necessary indexes for performance

-- IMPORTANT: Direct orders do NOT affect inventory. They are tracked separately
-- for orders that are shipped directly by brands to customers.
