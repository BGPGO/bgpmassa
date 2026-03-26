FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── Instalar dependências ─────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install || (echo "pnpm install failed" && exit 1)

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Compila o pacote shared
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

# Debug: show what we have before building
RUN echo "=== DEBUG: listing apps/web ===" && ls -la && \
    echo "=== DEBUG: next binary ===" && ls -la /app/node_modules/.bin/next && \
    echo "=== DEBUG: next.config ===" && cat next.config.ts && \
    echo "=== DEBUG: starting next build ===" && \
    /app/node_modules/.bin/next build 2>&1 || \
    (echo "=== NEXT BUILD FAILED ===" && cat .next/trace 2>/dev/null; exit 1)

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
RUN mkdir -p /app/public
EXPOSE 3000
CMD ["node", "server.js"]
