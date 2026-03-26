FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── Instalar dependências ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Compila o pacote shared e garante que node_modules tem o dist compilado
RUN cd packages/shared && \
    /app/node_modules/.bin/tsc --skipLibCheck || true && \
    mkdir -p /app/node_modules/@bgpmassa/shared && \
    cp -r /app/packages/shared/dist /app/node_modules/@bgpmassa/shared/ && \
    cp /app/packages/shared/package.json /app/node_modules/@bgpmassa/shared/

WORKDIR /app/apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN ls -la /app/node_modules/.bin/next && \
    echo "--- next.config.ts ---" && cat next.config.ts && \
    /app/node_modules/.bin/next build

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server.js"]
