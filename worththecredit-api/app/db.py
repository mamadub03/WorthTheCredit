"""Database engine, session factory, declarative Base, and the `get_db` dependency.

BE1 owns the real Tiger Data connection. If BE1's version exists, delete this
file and import their `Base` / `get_db`; BE2's models only need those two.
Tables are created by Alembic migrations (`alembic upgrade head`), not here.
"""

from collections.abc import Iterator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

# Predictable constraint names make Alembic migrations stable across machines.
NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


# pool_pre_ping: hosted Postgres (Tiger Data) closes idle connections; this
# transparently reconnects instead of failing the next request.
engine = create_engine(get_settings().database_url, pool_pre_ping=True, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """One session per request, always closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def import_all_models() -> None:
    """Registers every model on Base.metadata (used by Alembic)."""
    from app.be1_stubs import models as _be1  # noqa: F401
    from app.profile import models as _profile  # noqa: F401
    from app.reviews import models as _reviews  # noqa: F401
