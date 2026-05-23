"""Initialize database and start FastAPI server."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from app.database import async_engine, Base
from app.models import user, donation, payment, subscription, reconciliation  # noqa: F401

async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
    print("✅ Tables created. Run: uvicorn app.main:app --reload --port 8000")
