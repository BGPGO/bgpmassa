#!/bin/sh
echo "[Startup] ================================="
echo "[Startup] BGP Massa API v1"
echo "[Startup] PORT=$PORT"
echo "[Startup] NODE_ENV=$NODE_ENV"
echo "[Startup] ================================="

# Build DATABASE_URL with properly URL-encoded credentials.
# Passwords with @, %, &, ( break raw URL interpolation in docker-compose.
export DATABASE_URL=$(node -e "
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'bgpmassa');
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD || '');
  const db   = process.env.POSTGRES_DB || 'bgpmassa';
  console.log('postgresql://' + user + ':' + pass + '@postgres:5432/' + db);
")
echo "[Startup] Database URL built for postgres:5432"

# docker-compose depends_on (service_healthy) already ensures postgres + redis
# are ready before this container starts. No extra TCP wait needed.

echo "[Startup] Running migrations..."
node_modules/.bin/prisma migrate deploy || echo "[Startup] Migration failed, continuing..."

echo "[Startup] Running seed..."
node dist/seed.js || echo "[Startup] Seed failed, continuing..."

echo "[Startup] Starting server..."
exec node dist/server.js
