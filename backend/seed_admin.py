"""Seed an admin user for backend testing.

Usage:
    cd backend && python seed_admin.py

This creates (or updates) an admin user with known credentials
so you can log into the admin dashboard at /admin/dashboard.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session_factory
from app.repositories.user import UserRepository
from app.models import user  # noqa: F401 — register models
from app.schemas.user import UserResponse


async def seed_admin():
    email = os.getenv("ADMIN_EMAIL", "admin@donationsystem.test")
    password = os.getenv("ADMIN_PASSWORD", "AdminP@ss123")
    name = os.getenv("ADMIN_NAME", "系統管理員")

    async with async_session_factory() as session:
        repo = UserRepository(session)

        existing = await repo.get_by_email(email)
        if existing:
            # Update existing user to admin
            print(f"⚠️  User {email} already exists (role={existing.role})")
            if existing.role != "admin":
                existing.role = "admin"
                existing.name = name
                await session.flush()
                print(f"✅  Promoted {email} to admin")
            else:
                print(f"ℹ️   {email} is already admin")
        else:
            user = await repo.create_user(
                email=email,
                password=password,
                name=name,
                phone="0912345678",
                role="admin",
                tax_consent=True,
            )
            print(f"✅  Created admin: {user.email} (role={user.role})")

        await session.commit()

    print(f"\n🔑  Login credentials:")
    print(f"   Email:    {email}")
    print(f"   Password: {password}")
    print(f"   URL:      http://localhost:3000/admin/dashboard")


if __name__ == "__main__":
    asyncio.run(seed_admin())
