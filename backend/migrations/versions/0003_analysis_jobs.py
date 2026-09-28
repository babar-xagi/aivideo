"""Add persisted analysis jobs and mock reports.

Revision ID: 0003_analysis_jobs
Revises: 0002_recording_upload
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_analysis_jobs"
down_revision: str | None = "0002_recording_upload"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "analysis_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Uuid(),
            sa.ForeignKey("practice_sessions.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True)),
        sa.Column("report", sa.JSON()),
        sa.Column("error_message", sa.String(200)),
    )
    op.create_index(
        "ix_analysis_jobs_status_created", "analysis_jobs", ["status", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_analysis_jobs_status_created", table_name="analysis_jobs")
    op.drop_table("analysis_jobs")
