"""add states and cities, link inspection events and territory options to city

Revision ID: f44939c5befc
Revises: 88486008f941
Create Date: 2026-08-02 14:41:46.819139

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f44939c5befc'
down_revision: Union[str, Sequence[str], None] = '88486008f941'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Fixed at migration-write time so both the seed insert and the city_id
# backfill below reference the exact same rows.
ILLINOIS_STATE_ID = str(uuid.uuid4())
CHICAGO_CITY_ID = str(uuid.uuid4())


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('states',
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('code', sa.String(), nullable=False),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code'),
    sa.UniqueConstraint('name')
    )
    op.create_table('cities',
    sa.Column('state_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('code', sa.String(), nullable=False),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['state_id'], ['states.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code'),
    sa.UniqueConstraint('state_id', 'name', name='uq_city_state_name')
    )

    # Seed the one state/city this app has ever served — same string
    # ("chicago") already used everywhere as source_city/city_code.
    op.execute(
        f"""
        INSERT INTO states (id, name, code, created_at, updated_at)
        VALUES ('{ILLINOIS_STATE_ID}', 'Illinois', 'IL', now(), now())
        """
    )
    op.execute(
        f"""
        INSERT INTO cities (id, state_id, name, code, created_at, updated_at)
        VALUES ('{CHICAGO_CITY_ID}', '{ILLINOIS_STATE_ID}', 'Chicago', 'chicago', now(), now())
        """
    )

    # New territory kind: a client matches every event in a city regardless
    # of zip. Not used anywhere yet in this migration, so adding it is safe
    # within this same transaction.
    op.execute("ALTER TYPE territory_kind ADD VALUE 'CITY'")

    # city_id starts nullable so it can be backfilled on the existing 81
    # inspection_events / 58 territory_options rows (all source_city='chicago'
    # today) before being locked down to NOT NULL.
    op.add_column('inspection_events', sa.Column('city_id', sa.UUID(), nullable=True))
    op.execute(f"UPDATE inspection_events SET city_id = '{CHICAGO_CITY_ID}' WHERE source_city = 'chicago'")
    op.alter_column('inspection_events', 'city_id', nullable=False)
    op.create_index(op.f('ix_inspection_events_city_id'), 'inspection_events', ['city_id'], unique=False)
    op.create_foreign_key(None, 'inspection_events', 'cities', ['city_id'], ['id'], ondelete='RESTRICT')

    op.add_column('territory_options', sa.Column('city_id', sa.UUID(), nullable=True))
    op.execute(f"UPDATE territory_options SET city_id = '{CHICAGO_CITY_ID}' WHERE source_city = 'chicago'")
    op.alter_column('territory_options', 'city_id', nullable=False)
    op.create_index(op.f('ix_territory_options_city_id'), 'territory_options', ['city_id'], unique=False)
    op.create_foreign_key(None, 'territory_options', 'cities', ['city_id'], ['id'], ondelete='RESTRICT')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'territory_options', type_='foreignkey')
    op.drop_index(op.f('ix_territory_options_city_id'), table_name='territory_options')
    op.drop_column('territory_options', 'city_id')
    op.drop_constraint(None, 'inspection_events', type_='foreignkey')
    op.drop_index(op.f('ix_inspection_events_city_id'), table_name='inspection_events')
    op.drop_column('inspection_events', 'city_id')
    # Note: TerritoryKind.CITY is not removed — Postgres can't drop a single
    # enum value without recreating the whole type, and nothing downstream
    # depends on it being absent.
    op.drop_table('cities')
    op.drop_table('states')
