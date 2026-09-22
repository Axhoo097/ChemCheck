"""pg_trgm extension + trigram index + product_ingredients table

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.types import GUID

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # pg_trgm powers Phase 2's fuzzy ingredient search (Section 2 of the
    # master prompt). Only meaningful on Postgres — skipped elsewhere so
    # this migration can still be sanity-checked against SQLite locally.
    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "product_ingredients",
        sa.Column("product_id", GUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("ingredient_id", GUID(), sa.ForeignKey("ingredients.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )

    if is_postgres:
        op.execute(
            "CREATE INDEX ix_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP INDEX IF EXISTS ix_ingredients_name_trgm")

    op.drop_table("product_ingredients")

    if is_postgres:
        op.execute("DROP EXTENSION IF EXISTS pg_trgm")
