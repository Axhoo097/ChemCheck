"""user_sensitivities table

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.models.types import GUID

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_sensitivities",
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("ingredient_id", GUID(), sa.ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("severity_note", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_sensitivities_user_id", "user_sensitivities", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_sensitivities_user_id", table_name="user_sensitivities")
    op.drop_table("user_sensitivities")
