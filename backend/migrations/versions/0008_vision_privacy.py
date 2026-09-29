"""Allow the owner to disable video landmark analysis per session."""

import sqlalchemy as sa
from alembic import op

revision = "0008_vision_privacy"
down_revision = "0007_vision_feedback"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "practice_sessions",
        sa.Column(
            "vision_enabled", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
    )


def downgrade() -> None:
    op.drop_column("practice_sessions", "vision_enabled")
