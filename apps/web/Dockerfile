# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm
WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source
COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package and wire it into node_modules
RUN node_modules/.bin/tsc -p packages/shared/tsconfig.json --skipLibCheck && \
    mkdir -p node_modules/@bgpmassa/shared && \
    cp -r packages/shared/dist node_modules/@bgpmassa/shared/dist && \
    cp -r packages/shared/src  node_modules/@bgpmassa/shared/src && \
    cp    packages/shared/package.json node_modules/@bgpmassa/shared/package.json

# URL interna da API (usada pelo proxy reverso do Next.js — não vai para o browser)
ARG INTERNAL_API_URL=http://api:3001
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR /app/apps/web
RUN /app/node_modules/.bin/next build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output preserves the monorepo directory structure:
#   .next/standalone/apps/web/server.js
#   .next/standalone/node_modules/...
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# public/ is empty — just create the directory
RUN mkdir -p ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
