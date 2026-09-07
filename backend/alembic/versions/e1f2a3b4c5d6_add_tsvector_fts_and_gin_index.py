"""add_tsvector_fts_and_gin_index

Revision ID: e1f2a3b4c5d6
Revises: 00603d0400cb
Create Date: 2026-09-07 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = '00603d0400cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to support PostgreSQL Full-Text Search tsvector and GIN index."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # 1. Add generated tsvector column for content + section
        op.execute("""
            ALTER TABLE knowledge_chunks 
            ADD COLUMN IF NOT EXISTS search_vector tsvector 
            GENERATED ALWAYS AS (
                to_tsvector('english', coalesce(content, '') || ' ' || coalesce(section, ''))
            ) STORED;
        """)

        # 2. Create GIN index for high-speed full-text inverted index searches
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_search_vector_gin
            ON knowledge_chunks
            USING gin (search_vector);
        """)
    else:
        # SQLite / local testing fallback
        with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
            batch_op.add_column(sa.Column('search_vector', sa.Text(), nullable=True))


def downgrade() -> None:
    """Revert full-text search schema changes."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_search_vector_gin;")
        op.execute("ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS search_vector;")
    else:
        with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
            batch_op.drop_column('search_vector')
