"""DonationSystem — FastAPI application entry point."""

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.core.limiter import limiter
from app.routers import users, donations, payments, subscriptions, admin, maintenance, audit

app = FastAPI(
    title=settings.app_name,
    version="0.5.0",
    docs_url="/api/docs",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register routers
app.include_router(users.router)
app.include_router(donations.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(admin.router)
app.include_router(maintenance.router)
app.include_router(audit.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name, "version": "0.5.0"}
