# Client Nuxt 4 - Build
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

COPY package.json pnpm-lock.yaml package-lock.json* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || npm ci 2>/dev/null || npm install

COPY . .

# Build con variable de API para runtime
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE:-http://localhost:8000}

# Aumentar heap de Node (fallback si se usa Dockerfile con build dentro de Docker)
ARG NODE_MAX_OLD_SPACE_SIZE=6144
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV NUXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build 2>/dev/null || npm run build

# Client Nuxt 4 - Producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
