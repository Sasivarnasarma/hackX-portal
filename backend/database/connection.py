import logging
import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Fallback to local sqlite database with async connector
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///hackx.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
    connect_args=connect_args,
)
if ".db" in DATABASE_URL.lower():
    logger.info(f"Database engine initialized: {DATABASE_URL}")
else:
    logger.info("Database engine initialized: postgre sql")

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
