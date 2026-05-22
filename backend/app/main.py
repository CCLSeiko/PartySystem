"""DonationSystem — FastAPI application entry point."""

from fastapi import FastAPI

from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
