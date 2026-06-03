#!/bin/bash
# ============================================================
# DonationSystem — Backend Entrypoint
# Waits for PostgreSQL, runs migrations, seeds admin, starts uvicorn
# ============================================================
set -e

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait a bit more for PostgreSQL to fully accept connections
sleep 2

# Fix permissions for files copied via docker cp (run as root)
if [ "$(id -u)" = "0" ]; then
  echo "🔧 Fixing file permissions..."
  find /app -type f -name "*.py" -exec chmod 644 {} \; 2>/dev/null || true
  chown -R donation:donation /app 2>/dev/null || true
fi

# Run Alembic migrations
echo "🔄 Running database migrations..."
alembic upgrade head
echo "✅ Migrations complete"

# Seed admin user (idempotent) — non-fatal
echo "👤 Seeding admin user..."
python seed_admin.py || echo "⚠️  Admin seed skipped (will retry on next restart)"
echo "✅ Admin seed complete"

# Start uvicorn
echo "🚀 Starting FastAPI server on 0.0.0.0:8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
