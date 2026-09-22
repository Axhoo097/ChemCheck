"""initial tables: users, products, ingredients

Revision ID: 0001
Revises:
Create Date: 2026-09-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.types import GUID

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("skin_type", sa.String(length=50), nullable=True),
        sa.Column("hair_type", sa.String(length=50), nullable=True),
        sa.Column("diet_preference", sa.String(length=50), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "products",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("barcode", sa.String(length=64), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_products_name", "products", ["name"], unique=False)
    op.create_index("ix_products_category", "products", ["category"], unique=False)
    op.create_index("ix_products_barcode", "products", ["barcode"], unique=True)

    op.create_table(
        "ingredients",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("function", sa.String(length=255), nullable=True),
        sa.Column("risk_level", sa.String(length=20), nullable=False, server_default="low"),
        sa.Column("is_allergen", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("evidence_level", sa.String(length=20), nullable=False, server_default="moderate"),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index("ix_ingredients_name", "ingredients", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_ingredients_name", table_name="ingredients")
    op.drop_table("ingredients")

    op.drop_index("ix_products_barcode", table_name="products")
    op.drop_index("ix_products_category", table_name="products")
    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("products")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
