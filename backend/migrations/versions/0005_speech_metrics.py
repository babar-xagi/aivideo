"""Store calculated speech metrics.

Revision ID: 0005_speech_metrics
Revises: 0004_transcripts
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_speech_metrics"
down_revision: str | None = "0004_transcripts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analysis_jobs", sa.Column("metrics", sa.JSON()))


def downgrade() -> None:
    op.drop_column("analysis_jobs", "metrics")
