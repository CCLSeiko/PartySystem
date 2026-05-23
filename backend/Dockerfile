# ============================================================
# DonationSystem — FastAPI Backend (Production)
# ============================================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps to /opt/venv
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Runtime image ──
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl ca-certificates postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy virtualenv from builder and add to PATH
COPY --from=builder /opt/venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH

# Create app user
RUN groupadd -r donation && useradd -r -g donation -d /app donation

WORKDIR /app

# Copy application code
COPY alembic.ini alembic.ini
COPY alembic/ alembic/
COPY app/ app/
COPY init_db.py seed_admin.py entrypoint.sh ./

# Ensure proper permissions
RUN chown -R donation:donation /app

USER donation

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
