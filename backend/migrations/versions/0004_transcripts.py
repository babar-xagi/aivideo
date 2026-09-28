"""Store timestamped transcripts alongside analysis jobs.

Revision ID: 0004_transcripts
Revises: 0003_analysis_jobs
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_transcripts"
down_revision: str | None = "0003_analysis_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analysis_jobs", sa.Column("transcript", sa.JSON()))


def downgrade() -> None:
    op.drop_column("analysis_jobs", "transcript")
