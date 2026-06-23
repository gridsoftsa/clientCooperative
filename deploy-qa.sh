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
export NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE:-6144}"

cd "$CLIENT_DIR"

echo "→ Build Nuxt en el host..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm run build
else
  npm ci
  npm run build
fi

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
