FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── Instalar dependências ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/
RUN pnpm install --filter @bgpmassa/api

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# Compila o pacote shared primeiro e injeta o dist no node_modules
RUN cd packages/shared && /app/node_modules/.bin/tsc --skipLibCheck
RUN cp -r /app/packages/shared/dist /app/node_modules/@bgpmassa/shared/dist
# Gera o Prisma client e compila a API
RUN cd apps/api && /app/node_modules/.bin/prisma generate
RUN cd apps/api && /app/node_modules/.bin/tsc --skipLibCheck

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Com node-linker=hoisted, todos os pacotes ficam no node_modules raiz
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

# Roda migrations e inicia o servidor
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
