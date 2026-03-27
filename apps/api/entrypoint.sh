#!/bin/sh
echo "[Startup] ================================="
echo "[Startup] BGP Massa API v1"
echo "[Startup] PORT=$PORT"
echo "[Startup] NODE_ENV=$NODE_ENV"
echo "[Startup] ================================="

# docker-compose depends_on (service_healthy) already ensures postgres + redis
# are ready before this container starts. No extra TCP wait needed.

echo "[Startup] Running migrations..."
node_modules/.bin/prisma migrate deploy || echo "[Startup] Migration failed, continuing..."

echo "[Startup] Running seed..."
node dist/seed.js || echo "[Startup] Seed failed, continuing..."

echo "[Startup] Starting server..."
exec node dist/server.js
