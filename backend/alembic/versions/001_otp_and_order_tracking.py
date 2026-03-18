"""OTP login (users.phone, nullable hashed_password) and orders.tracking_id

Revision ID: 001_otp_tracking
Revises:
Create Date: 2025-03-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_otp_tracking"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users: add phone (customer OTP login)
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    # Users: allow null hashed_password (OTP-only customers)
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(255),
        nullable=True,
    )

    # Orders: add tracking_id (AWB from Shiprocket)
    op.add_column("orders", sa.Column("tracking_id", sa.String(100), nullable=True))
    op.create_index("ix_orders_tracking_id", "orders", ["tracking_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_orders_tracking_id", table_name="orders")
    op.drop_column("orders", "tracking_id")

    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(255),
        nullable=False,
    )
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_column("users", "phone")
