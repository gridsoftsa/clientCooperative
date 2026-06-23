#!/usr/bin/env bash
# Despliegue cliente Nuxt — entorno QA.
# Compila en el host (Nitro OOM dentro de docker build en VPS con poca RAM).
# Uso: ./deploy-qa.sh  (o desde clientCooperative-qa)
set -euo pipefail

CLIENT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_QA=(bash "$CLIENT_DIR/scripts/compose-qa.sh")
ENV_FILE="$CLIENT_DIR/.env.qa.compose"
IMAGE_TAG="${CLIENT_QA_IMAGE:-cooperative_qa_client:latest}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-https://api-qa-gd.tecnologicaslf.com}"
export NODE_ENV=production
export NUXT_TELEMETRY_DISABLED=1

cd "$CLIENT_DIR"

HEAP_MB="${NODE_MAX_OLD_SPACE_SIZE:-6144}"
NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"

build_nuxt() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "→ Build Nuxt en el host (pnpm)..."
    pnpm install --frozen-lockfile
    pnpm run build
  elif command -v npm >/dev/null 2>&1; then
    echo "→ Build Nuxt en el host (npm)..."
    npm ci
    npm run build
  else
    echo "→ Build Nuxt con contenedor Node (sin Node en el host)..."
    sudo docker run --rm \
      -v "$CLIENT_DIR:/app" \
      -v cooperative_qa_nuxt_node_modules:/app/node_modules \
      -w /app \
      -e NUXT_PUBLIC_API_BASE="$NUXT_PUBLIC_API_BASE" \
      -e NODE_ENV=production \
      -e NUXT_TELEMETRY_DISABLED=1 \
      -e NODE_OPTIONS="$NODE_OPTIONS" \
      node:22-alpine \
      sh -ec 'corepack enable && corepack prepare pnpm@10.10.0 --activate && (pnpm install --frozen-lockfile || pnpm install || npm ci) && pnpm run build'
  fi
}

build_nuxt

if [[ ! -f .output/server/index.mjs ]]; then
  echo "ERROR: no se generó .output/server/index.mjs" >&2
  exit 1
fi

echo "→ Imagen Docker (solo .output, sin compilar dentro)..."
sudo docker build -f Dockerfile.runner -t "$IMAGE_TAG" .

echo "→ Recreando contenedor client QA..."
"${COMPOSE_QA[@]}" up -d client --no-build

echo "→ Listo (QA). Cliente en puerto host ${CLIENT_HOST_PORT:-3536}"
echo "   Logs: ${COMPOSE_QA[*]} logs -f client"
