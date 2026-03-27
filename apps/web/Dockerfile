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
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Instala todas as dependências do workspace (hoisted)
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copia node_modules já instalados
COPY --from=deps /app/node_modules ./node_modules

# Copia o código-fonte de cada pacote
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Compila o pacote shared e publica o dist em node_modules
RUN node_modules/.bin/tsc -p packages/shared/tsconfig.json --skipLibCheck && \
    mkdir -p node_modules/@bgpmassa/shared && \
    cp -r packages/shared/dist node_modules/@bgpmassa/shared/dist && \
    cp -r packages/shared/src  node_modules/@bgpmassa/shared/src  && \
    cp    packages/shared/package.json node_modules/@bgpmassa/shared/package.json

# Variáveis públicas baked no build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN echo "=== STEP 1: Check node_modules ===" && ls /app/node_modules/.bin/next
RUN echo "=== STEP 2: Check shared ===" && ls /app/node_modules/@bgpmassa/shared/dist/index.js
RUN echo "=== STEP 3: Check web files ===" && ls /app/apps/web/src/ && ls /app/apps/web/next.config.mjs

WORKDIR /app/apps/web
RUN echo "=== STEP 4: next build ===" && /app/node_modules/.bin/next build

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# O output standalone do Next.js inclui tudo que é necessário para rodar
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
RUN mkdir -p /app/public
EXPOSE 3000
CMD ["node", "server.js"]
