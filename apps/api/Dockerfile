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

COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
