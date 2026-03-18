-- Migration: Order system (cart, favorites, order_addresses, order columns)
-- Run against your database (e.g. psql -f scripts/migrate-order-system.sql)
-- Safe to run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where supported.
-- For PostgreSQL 9.5+ you can use ON CONFLICT or manual checks.

-- 1) Carts
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_session_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS ix_carts_guest_session_id ON carts(guest_session_id);
CREATE INDEX IF NOT EXISTS ix_carts_status ON carts(status);

-- 2) Cart items
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_snapshot JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS ix_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS ix_cart_items_variant_id ON cart_items(variant_id);

-- 3) Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guest_session_id VARCHAR(255),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_favorites_user_product UNIQUE (user_id, product_id),
    CONSTRAINT uq_favorites_guest_product UNIQUE (guest_session_id, product_id)
);
CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS ix_favorites_guest_session_id ON favorites(guest_session_id);
CREATE INDEX IF NOT EXISTS ix_favorites_product_id ON favorites(product_id);

-- 4) Order addresses
CREATE TABLE IF NOT EXISTS order_addresses (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_order_addresses_order_id ON order_addresses(order_id);

-- 5) Add columns to orders (PostgreSQL 9.5+: IF NOT EXISTS for ADD COLUMN)
-- If your PG does not support IF NOT EXISTS, run the ALTERs without it and ignore "already exists" errors.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cart_id') THEN
    ALTER TABLE orders ADD COLUMN cart_id INTEGER REFERENCES carts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipment_status') THEN
    ALTER TABLE orders ADD COLUMN shipment_status VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shiprocket_order_id') THEN
    ALTER TABLE orders ADD COLUMN shiprocket_order_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shiprocket_shipment_id') THEN
    ALTER TABLE orders ADD COLUMN shiprocket_shipment_id VARCHAR(100);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_orders_cart_id ON orders(cart_id) WHERE cart_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_orders_payment_status ON orders(payment_status) WHERE payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_orders_shipment_status ON orders(shipment_status) WHERE shipment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_orders_shiprocket_order_id ON orders(shiprocket_order_id) WHERE shiprocket_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_orders_shiprocket_shipment_id ON orders(shiprocket_shipment_id) WHERE shiprocket_shipment_id IS NOT NULL;

-- UUIDs for existing tables: if tables were created by SQLAlchemy they already have uuid.
-- If you created tables with this script, generate UUIDs:
-- UPDATE carts SET uuid = gen_random_uuid()::text WHERE uuid IS NULL OR length(uuid) < 10;
-- (Repeat for cart_items, favorites, order_addresses as needed.)
