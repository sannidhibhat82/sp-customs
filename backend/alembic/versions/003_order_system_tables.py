"""Add order-system tables/columns (carts, cart_items, favorites, order_addresses).

This mirrors the legacy `scripts/run-order-migration.py` SQL so Alembic can manage
these objects declaratively.

Created for: Shipping + Book Now / Checkout flow.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "003_order_system_tables"
down_revision: Union[str, Sequence[str], None] = "002_user_addresses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- Carts ----
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS carts (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            guest_session_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_carts_user_id ON carts(user_id);")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_carts_guest_session_id ON carts(guest_session_id);"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_carts_status ON carts(status);")

    # ---- Cart items ----
    op.execute(
        """
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
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_cart_items_cart_id ON cart_items(cart_id);")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cart_items_product_id ON cart_items(product_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cart_items_variant_id ON cart_items(variant_id);"
    )

    # ---- Favorites ----
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            guest_session_id VARCHAR(255),
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites(user_id);")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_favorites_guest_session_id ON favorites(guest_session_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_favorites_product_id ON favorites(product_id);"
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_product
        ON favorites(user_id, product_id)
        WHERE user_id IS NOT NULL;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_guest_product
        ON favorites(guest_session_id, product_id)
        WHERE guest_session_id IS NOT NULL;
        """
    )

    # ---- Order addresses ----
    # Note: `order_addresses` may already exist in your DB from legacy scripts.
    op.execute(
        """
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
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_order_addresses_order_id ON order_addresses(order_id);"
    )

    # ---- Orders columns (legacy SQL) ----
    # Use a single DO $$ block to add columns if they are missing.
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='cart_id'
          ) THEN
            ALTER TABLE orders
            ADD COLUMN cart_id INTEGER REFERENCES carts(id) ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='payment_status'
          ) THEN
            ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='shipment_status'
          ) THEN
            ALTER TABLE orders ADD COLUMN shipment_status VARCHAR(50);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='shiprocket_order_id'
          ) THEN
            ALTER TABLE orders ADD COLUMN shiprocket_order_id VARCHAR(100);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='shiprocket_shipment_id'
          ) THEN
            ALTER TABLE orders ADD COLUMN shiprocket_shipment_id VARCHAR(100);
          END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # For safety, downgrade is intentionally conservative.
    # If you need rollback, handle it manually because other tables/data
    # may already depend on these objects.
    pass

