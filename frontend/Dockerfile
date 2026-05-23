# ============================================================
# DonationSystem — Frontend Builder
# Multi-stage: builds static export, outputs to /app/out
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source code
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public/ public/
COPY src/ src/

# Build static export
RUN npm run build

# ── Output stage (alpine for cp command) ──
FROM alpine:3.18
COPY --from=builder /app/out /app/out
CMD ["cp", "-r", "/app/out/.", "/shared/"]
