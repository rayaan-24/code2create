"""add_pgvector_extension_and_vector_column

Revision ID: 00603d0400cb
Revises: 4a11fcd9f612
Create Date: 2026-09-07 11:28:57.009985

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '00603d0400cb'
down_revision: Union[str, Sequence[str], None] = '4a11fcd9f612'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to support PostgreSQL + pgvector foundation."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # 1. Enable pgvector extension in PostgreSQL
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

        # 2. Add native vector(384) column
        op.add_column(
            'knowledge_chunks',
            sa.Column('embedding', Vector(384), nullable=True)
        )

        # 3. Safely backfill embedding from existing embedding_json where format is valid JSON array
        # Note: embedding_json is kept intact to prevent any data loss
        op.execute(r"""
            UPDATE knowledge_chunks
            SET embedding = embedding_json::vector
            WHERE embedding IS NULL
              AND embedding_json IS NOT NULL
              AND embedding_json ~ '^\s*\[(\s*-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?\s*,?)+\s*\]\s*$';
        """)

        # 4. Create HNSW index for high-speed cosine vector similarity search
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops);
        """)

        # 5. Ensure community_id and verification_status indexes exist
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_community_id
            ON knowledge_chunks (community_id);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_verification_status
            ON knowledge_chunks (verification_status);
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_community_status
            ON knowledge_chunks (community_id, verification_status);
        """)
    else:
        # SQLite / Local Development fallback
        with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
            batch_op.add_column(sa.Column('embedding', Vector(384), nullable=True))


def downgrade() -> None:
    """Revert pgvector schema changes."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # Drop HNSW index
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_hnsw")
        # Drop embedding column
        op.drop_column('knowledge_chunks', 'embedding')
    else:
        with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
            batch_op.drop_column('embedding')
