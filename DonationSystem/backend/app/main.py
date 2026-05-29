"""DonationSystem — FastAPI application entry point."""

from fastapi import FastAPI

from app.config import settings
from app.routers import users, donations, payments, subscriptions, admin, maintenance

app = FastAPI(
    title=settings.app_name,
    version="0.3.0",
    docs_url="/api/docs",
)

# Register routers
app.include_router(users.router)
app.include_router(donations.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(admin.router)
app.include_router(maintenance.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name, "version": "0.3.0"}
