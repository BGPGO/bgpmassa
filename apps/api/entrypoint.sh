#!/bin/sh
set -e

echo "========================================="
echo "[Startup] BGP Massa API starting..."
echo "[Startup] NODE_ENV=$NODE_ENV"
echo "[Startup] DATABASE_URL=$(echo "$DATABASE_URL" | cut -c1-40)..."
echo "[Startup] REDIS_URL=$REDIS_URL"
echo "[Startup] PORT=$PORT"
echo "========================================="

# Wait for PostgreSQL to be ready
echo "[Startup] Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect()
    .then(() => { console.log('[Startup] PostgreSQL is ready!'); c.end(); process.exit(0); })
    .catch(err => { console.error('[Startup] PostgreSQL not ready:', err.message); process.exit(1); });
" 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "[Startup] ERROR: PostgreSQL not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "[Startup] Retry $RETRY/$MAX_RETRIES - waiting 2s..."
  sleep 2
done

# Wait for Redis to be ready
echo "[Startup] Waiting for Redis..."
RETRY=0
until node -e "
  const Redis = require('ioredis');
  const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, connectTimeout: 3000 });
  r.connect()
    .then(() => { console.log('[Startup] Redis is ready!'); r.disconnect(); process.exit(0); })
    .catch(err => { console.error('[Startup] Redis not ready:', err.message); process.exit(1); });
" 2>&1; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "[Startup] ERROR: Redis not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "[Startup] Retry $RETRY/$MAX_RETRIES - waiting 2s..."
  sleep 2
done

# Run Prisma migrations
echo "[Startup] Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy
echo "[Startup] Migrations complete."

# Run seed (idempotent)
echo "[Startup] Running seed..."
node dist/seed.js
echo "[Startup] Seed complete."

# Start server
echo "[Startup] Starting server..."
exec node dist/server.js
