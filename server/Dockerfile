# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# ── Runtime ───────────────────────────────────────────────────────────────────
# Persist the SQLite database across container restarts by mounting a volume
# at /data. The DB_PATH env var tells db.js where to create the file.
ENV PORT=3000 \
    NODE_ENV=production \
    DB_PATH=/data/quickslot.db

EXPOSE 3000

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "src/index.js"]
