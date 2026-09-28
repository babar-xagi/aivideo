"""Store structured language feedback or an explicit unavailable reason.

Revision ID: 0006_language_feedback
Revises: 0005_speech_metrics
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_language_feedback"
down_revision: str | None = "0005_speech_metrics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analysis_jobs", sa.Column("language_feedback", sa.JSON()))


def downgrade() -> None:
    op.drop_column("analysis_jobs", "language_feedback")
