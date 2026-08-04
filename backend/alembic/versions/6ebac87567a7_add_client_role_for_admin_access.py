"""add client role for admin access

Revision ID: 6ebac87567a7
Revises: c74e81799494
Create Date: 2026-08-02 05:30:16.255993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ebac87567a7'
down_revision: Union[str, Sequence[str], None] = 'c74e81799494'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


client_role_enum = sa.Enum('CLIENT', 'ADMIN', name='client_role')


def upgrade() -> None:
    """Upgrade schema."""
    client_role_enum.create(op.get_bind(), checkfirst=True)
    # server_default backfills existing rows (clients table is not empty);
    # the model only declares a Python-side default, which is fine for new
    # rows going forward but can't satisfy NOT NULL on rows that already exist.
    op.add_column(
        'clients',
        sa.Column('role', client_role_enum, nullable=False, server_default='CLIENT'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('clients', 'role')
    client_role_enum.drop(op.get_bind(), checkfirst=True)
