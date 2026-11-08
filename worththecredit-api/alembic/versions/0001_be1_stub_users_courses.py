"""BE1 STUB: users and courses tables.

DELETE THIS FILE once BE1's own migrations exist, and set
`down_revision` in 0002 to BE1's latest revision id.

Revision ID: 0001_be1_stubs
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_be1_stubs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("auth0_sub", sa.String(128), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("auth0_sub", name="uq_users_auth0_sub"),
    )

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("department", sa.String(120), server_default="", nullable=False),
        sa.Column("credit_hours", sa.Integer(), nullable=True),
        sa.Column("prerequisites", sa.Text(), server_default="", nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_courses"),
        sa.UniqueConstraint("code", name="uq_courses_code"),
    )


def downgrade() -> None:
    op.drop_table("courses")
    op.drop_table("users")
