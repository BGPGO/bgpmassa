#!/bin/sh
echo "[Startup] ================================="
echo "[Startup] BGP Massa API v1"
echo "[Startup] DATABASE_URL=$(echo $DATABASE_URL | cut -c1-50)..."
echo "[Startup] REDIS_URL=$REDIS_URL"
echo "[Startup] PORT=$PORT"
echo "[Startup] ================================="

wait_for_tcp() {
  SERVICE=$1
  HOST=$2
  PORT=$3
  RETRIES=30

  echo "[Startup] Waiting for $SERVICE at $HOST:$PORT..."
  i=1
  while [ $i -le $RETRIES ]; do
    node -e "
      const net = require('net');
      const s = net.createConnection($PORT, '$HOST');
      s.on('connect', () => { s.destroy(); process.exit(0); });
      s.on('error', () => { s.destroy(); process.exit(1); });
    " 2>/dev/null && echo "[Startup] $SERVICE is ready." && return 0
    echo "[Startup] $SERVICE not ready (attempt $i/$RETRIES), retrying in 1s..."
    i=$((i + 1))
    sleep 1
  done

  echo "[Startup] ERROR: $SERVICE did not become ready after $RETRIES attempts."
  exit 1
}

# Extract postgres host and port from DATABASE_URL
PG_HOST=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname);")
PG_PORT=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.port || 5432);")

# Extract redis host and port from REDIS_URL
REDIS_HOST=$(node -e "const u=new URL(process.env.REDIS_URL); console.log(u.hostname);")
REDIS_PORT=$(node -e "const u=new URL(process.env.REDIS_URL); console.log(u.port || 6379);")

wait_for_tcp "Postgres" "$PG_HOST" "$PG_PORT"
wait_for_tcp "Redis" "$REDIS_HOST" "$REDIS_PORT"

echo "[Startup] Running migrations..."
node_modules/.bin/prisma migrate deploy || echo "[Startup] Migration failed, continuing..."

echo "[Startup] Running seed..."
node dist/seed.js || echo "[Startup] Seed failed, continuing..."

echo "[Startup] Starting server..."
exec node dist/server.js
