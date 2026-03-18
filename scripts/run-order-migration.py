#!/usr/bin/env python3
"""Run order system migration using SQLAlchemy sync engine. No psql required."""
import os
import sys

def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))

_load_env()
# Default if no .env
os.environ.setdefault("DATABASE_URL_SYNC", "postgresql://postgres:root@localhost:5432/sp_customs")

from sqlalchemy import text, create_engine
sync_engine = create_engine(
    os.environ["DATABASE_URL_SYNC"],
    pool_pre_ping=True,
)

MIGRATION_SQL = """
-- Carts
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

-- Cart items
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

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guest_session_id VARCHAR(255),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS ix_favorites_guest_session_id ON favorites(guest_session_id);
CREATE INDEX IF NOT EXISTS ix_favorites_product_id ON favorites(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_product ON favorites(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_guest_product ON favorites(guest_session_id, product_id) WHERE guest_session_id IS NOT NULL;

-- Order addresses
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
"""

def add_column_if_not_exists(conn, table, column, col_def):
    r = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :t AND column_name = :c
    """), {"t": table, "c": column})
    if r.fetchone() is None:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
        conn.commit()
        print(f"  Added {table}.{column}")

def main():
    print("Running order system migration...")
    for stmt in MIGRATION_SQL.strip().split(";"):
        stmt = stmt.strip()
        if not stmt or stmt.startswith("--"):
            continue
        try:
            with sync_engine.connect() as conn:
                conn.execute(text(stmt))
                conn.commit()
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                pass
            else:
                print(f"  Note: {e}")

    with sync_engine.connect() as conn:
        add_column_if_not_exists(conn, "orders", "cart_id", "INTEGER REFERENCES carts(id) ON DELETE SET NULL")
        add_column_if_not_exists(conn, "orders", "payment_status", "VARCHAR(50)")
        add_column_if_not_exists(conn, "orders", "shipment_status", "VARCHAR(50)")
        add_column_if_not_exists(conn, "orders", "shiprocket_order_id", "VARCHAR(100)")
        add_column_if_not_exists(conn, "orders", "shiprocket_shipment_id", "VARCHAR(100)")
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    main()
