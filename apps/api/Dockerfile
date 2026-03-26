FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── Instalar dependências ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/
COPY apps/api/.npmrc ./apps/api/
RUN pnpm install --filter @bgpmassa/api

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# Compila o pacote shared e garante que node_modules tem o dist compilado
RUN cd packages/shared && /app/node_modules/.bin/tsc --skipLibCheck && \
    mkdir -p /app/node_modules/@bgpmassa/shared && \
    cp -r /app/packages/shared/dist /app/node_modules/@bgpmassa/shared/ && \
    cp /app/packages/shared/package.json /app/node_modules/@bgpmassa/shared/
# Gera o Prisma client e compila a API
RUN cd apps/api && /app/node_modules/.bin/prisma generate
RUN cd apps/api && /app/node_modules/.bin/tsc --skipLibCheck --noEmitOnError false || true
RUN ls -la apps/api/dist/server.js || (echo "ERROR: tsc produced no output" && exit 1)

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# OpenSSL is required by Prisma on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
