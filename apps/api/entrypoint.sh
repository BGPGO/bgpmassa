#!/bin/sh
echo "[Startup] ================================="
echo "[Startup] BGP Massa API v1"
echo "[Startup] DATABASE_URL=$(echo $DATABASE_URL | cut -c1-50)..."
echo "[Startup] REDIS_URL=$REDIS_URL"
echo "[Startup] PORT=$PORT"
echo "[Startup] ================================="

echo "[Startup] Sleeping 10s for postgres/redis..."
sleep 10

echo "[Startup] Running migrations..."
node_modules/.bin/prisma migrate deploy || echo "[Startup] Migration failed, continuing..."

echo "[Startup] Running seed..."
node dist/seed.js || echo "[Startup] Seed failed, continuing..."

echo "[Startup] Starting server..."
exec node dist/server.js
