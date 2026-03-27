#!/bin/sh

echo "========================================="
echo "[Startup] BGP Massa API starting..."
echo "[Startup] NODE_ENV=$NODE_ENV"
echo "[Startup] DATABASE_URL=$(echo "$DATABASE_URL" | cut -c1-50)..."
echo "[Startup] REDIS_URL=$REDIS_URL"
echo "[Startup] PORT=$PORT"
echo "========================================="

# Wait for PostgreSQL with simple TCP check (no modules needed)
echo "[Startup] Waiting for PostgreSQL..."
RETRY=0
while [ $RETRY -lt 30 ]; do
  if node -e "
    const net = require('net');
    const url = new URL(process.env.DATABASE_URL);
    const s = net.createConnection(parseInt(url.port) || 5432, url.hostname);
    s.on('connect', () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    setTimeout(() => process.exit(1), 3000);
  " 2>/dev/null; then
    echo "[Startup] PostgreSQL is reachable!"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "[Startup] PostgreSQL not ready, retry $RETRY/30..."
  sleep 2
done

if [ $RETRY -ge 30 ]; then
  echo "[Startup] ERROR: PostgreSQL not reachable after 30 attempts."
  exit 1
fi

# Wait for Redis with simple TCP check
echo "[Startup] Waiting for Redis..."
RETRY=0
while [ $RETRY -lt 30 ]; do
  if node -e "
    const net = require('net');
    const url = new URL(process.env.REDIS_URL || 'redis://redis:6379');
    const s = net.createConnection(parseInt(url.port) || 6379, url.hostname);
    s.on('connect', () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    setTimeout(() => process.exit(1), 3000);
  " 2>/dev/null; then
    echo "[Startup] Redis is reachable!"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "[Startup] Redis not ready, retry $RETRY/30..."
  sleep 2
done

# Run Prisma migrations
echo "[Startup] Running Prisma migrations..."
if ! node_modules/.bin/prisma migrate deploy; then
  echo "[Startup] ERROR: Prisma migration failed!"
  exit 1
fi
echo "[Startup] Migrations complete."

# Run seed (idempotent)
echo "[Startup] Running seed..."
if ! node dist/seed.js; then
  echo "[Startup] WARNING: Seed failed, continuing anyway..."
fi
echo "[Startup] Seed done."

# Start server
echo "[Startup] Starting server..."
exec node dist/server.js
