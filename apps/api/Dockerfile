FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── Instalar dependências ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copia manifestos do monorepo (necessário para pnpm workspace)
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copia package.json de cada workspace membro
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Instala todas as dependências do workspace (hoisted)
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copia node_modules já instalados
COPY --from=deps /app/node_modules ./node_modules

# Copia o código-fonte de cada pacote
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Compila o pacote shared e publica o dist em node_modules
RUN node_modules/.bin/tsc -p packages/shared/tsconfig.json --skipLibCheck && \
    mkdir -p node_modules/@bgpmassa/shared && \
    cp -r packages/shared/dist node_modules/@bgpmassa/shared/dist && \
    cp    packages/shared/package.json node_modules/@bgpmassa/shared/package.json

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

# Roda migrations, seed (idempotente) e inicia o servidor
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/seed.js && node dist/server.js"]
