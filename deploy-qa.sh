#!/usr/bin/env bash
# Despliegue cliente Nuxt — entorno QA.
# Uso: ./clientCooperative/deploy-qa.sh  (o desde clientCooperative-qa)
set -e

CLIENT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_QA=(bash "$CLIENT_DIR/scripts/compose-qa.sh")

echo "→ Build client QA sin caché..."
"${COMPOSE_QA[@]}" build --no-cache client

echo "→ Recreando contenedor client QA..."
"${COMPOSE_QA[@]}" up -d client

echo "→ Listo (QA). Cliente en puerto host 3536"
echo "   Logs: ${COMPOSE_QA[*]} logs -f client"
