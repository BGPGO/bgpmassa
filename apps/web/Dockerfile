FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN node_modules/.bin/tsc -p packages/shared/tsconfig.json --skipLibCheck && \
    mkdir -p node_modules/@bgpmassa/shared && \
    cp -r packages/shared/dist node_modules/@bgpmassa/shared/dist && \
    cp -r packages/shared/src  node_modules/@bgpmassa/shared/src && \
    cp    packages/shared/package.json node_modules/@bgpmassa/shared/package.json

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app/apps/web
RUN /app/node_modules/.bin/next build

EXPOSE 3000
CMD ["/app/node_modules/.bin/next", "start", "-p", "3000"]
