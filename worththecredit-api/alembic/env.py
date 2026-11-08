"""Alembic runs this to apply migrations.

The database URL comes from DATABASE_URL (via app.config), never from
alembic.ini, so no password is committed to git.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.config import get_settings
from app.db import Base, import_all_models

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import_all_models()
target_metadata = Base.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # The full-text-search expression index is created in raw SQL (migration 0002)
    # and isn't modeled in SQLAlchemy; don't let autogenerate try to drop it.
    return not (type_ == "index" and name == "ix_courses_fts")


def _url() -> str:
    # Tests (and scripts) can pass an explicit URL: config.attributes["database_url"].
    return config.attributes.get("database_url") or get_settings().database_url


def run_migrations_offline() -> None:
    """`alembic upgrade head --sql` prints the SQL instead of running it."""
    context.configure(
        url=_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True, include_object=include_object
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
