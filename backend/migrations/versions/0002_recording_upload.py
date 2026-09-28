"""Track private recording uploads.

Revision ID: 0002_recording_upload
Revises: 0001_practice_sessions
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_recording_upload"
down_revision: str | None = "0001_practice_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("practice_sessions", sa.Column("upload_content_type", sa.String(40)))
    op.add_column("practice_sessions", sa.Column("upload_size_bytes", sa.Integer()))
    op.add_column(
        "practice_sessions", sa.Column("upload_expires_at", sa.DateTime(timezone=True))
    )
    op.add_column("practice_sessions", sa.Column("recording_etag", sa.String(200)))


def downgrade() -> None:
    op.drop_column("practice_sessions", "recording_etag")
    op.drop_column("practice_sessions", "upload_expires_at")
    op.drop_column("practice_sessions", "upload_size_bytes")
    op.drop_column("practice_sessions", "upload_content_type")
