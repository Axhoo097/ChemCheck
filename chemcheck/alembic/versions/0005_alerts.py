"""alerts table

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.types import GUID

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("product_id", GUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=True),
        sa.Column("ingredient_id", GUID(), sa.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_product_id", "alerts", ["product_id"])
    op.create_index("ix_alerts_ingredient_id", "alerts", ["ingredient_id"])


def downgrade() -> None:
    op.drop_index("ix_alerts_ingredient_id", table_name="alerts")
    op.drop_index("ix_alerts_product_id", table_name="alerts")
    op.drop_table("alerts")
