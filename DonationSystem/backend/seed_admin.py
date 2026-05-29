"""Seed an admin user and a donation maintainer for backend testing.

Usage:
    cd backend && python seed_admin.py [--maintainer]

Flags:
    --maintainer    Also seed a donation_maintainer account

This creates (or updates) users with known credentials
so you can log into the appropriate dashboard.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session_factory
from app.repositories.user import UserRepository
from app.models import user  # noqa: F401 — register models
from app.schemas.user import UserResponse


async def seed_admin():
    email = os.getenv("ADMIN_EMAIL", "admin@donationsystem.dev")
    password = os.getenv("ADMIN_PASSWORD", "AdminP@ss123")
    name = os.getenv("ADMIN_NAME", "系統管理員")

    async with async_session_factory() as session:
        repo = UserRepository(session)

        existing = await repo.get_by_email(email)
        if existing:
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

    print(f"\n🔑  Admin login credentials:")
    print(f"   Email:    {email}")
    print(f"   Password: {password}")
    print(f"   URL:      http://localhost:3000/admin/dashboard")


async def seed_maintainer():
    email = os.getenv("MAINTAINER_EMAIL", "maintainer@donationsystem.dev")
    password = os.getenv("MAINTAINER_PASSWORD", "Maint@123")
    name = os.getenv("MAINTAINER_NAME", "捐款管理員")

    async with async_session_factory() as session:
        repo = UserRepository(session)

        existing = await repo.get_by_email(email)
        if existing:
            print(f"⚠️  User {email} already exists (role={existing.role})")
            if existing.role != "donation_maintainer":
                existing.role = "donation_maintainer"
                existing.name = name
                await session.flush()
                print(f"✅  Updated {email} to donation_maintainer")
            else:
                print(f"ℹ️   {email} is already donation_maintainer")
        else:
            user = await repo.create_user(
                email=email,
                password=password,
                name=name,
                phone="0912345679",
                role="donation_maintainer",
                tax_consent=False,
            )
            print(f"✅  Created donation_maintainer: {user.email} (role={user.role})")

        await session.commit()

    print(f"\n🔑  Donation maintainer login credentials:")
    print(f"   Email:    {email}")
    print(f"   Password: {password}")
    print(f"   URL:      http://localhost:3000/maintainer/donations")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed system accounts")
    parser.add_argument("--maintainer", action="store_true", help="Also seed a donation_maintainer account")
    args = parser.parse_args()

    asyncio.run(seed_admin())
    if args.maintainer:
        print()
        asyncio.run(seed_maintainer())
