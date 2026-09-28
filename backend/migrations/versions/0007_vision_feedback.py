"""Store measured vision feedback on analysis jobs."""

import sqlalchemy as sa
from alembic import op

revision = "0007_vision_feedback"
down_revision = "0006_language_feedback"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analysis_jobs", sa.Column("vision_feedback", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("analysis_jobs", "vision_feedback")
