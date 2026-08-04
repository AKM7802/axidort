"""add unpaid client status

Revision ID: a9f09480d01b
Revises: 7dbddf5666ae
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a9f09480d01b'
down_revision: Union[str, Sequence[str], None] = '7dbddf5666ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # New default status for freshly signed-up clients (see
    # app/models/client.py) — set before any Dodo Payments checkout
    # succeeds, so lead matching/digests and /me/* skip them until paid.
    # Postgres requires ADD VALUE outside the transaction that will use it;
    # this migration only adds the label, a later one is free to use it.
    op.execute("ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'UNPAID' BEFORE 'TRIAL'")


def downgrade() -> None:
    """Downgrade schema.

    Postgres has no DROP VALUE for enums; downgrading would require
    rebuilding the type and is not supported here. Existing UNPAID rows
    would need a manual UPDATE to another status before doing so.
    """
    pass
