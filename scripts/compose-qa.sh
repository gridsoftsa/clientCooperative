#!/usr/bin/env bash
# Helper: docker compose QA con proyecto y env-file por defecto.
set -euo pipefail

CLIENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$CLIENT_DIR/docker-compose.qa.yml"
ENV_FILE="$CLIENT_DIR/.env.qa.compose"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Falta $ENV_FILE (copia desde el repo o créalo en el servidor)."
  exit 1
fi

exec sudo docker compose \
  -p "${COMPOSE_PROJECT_NAME:-cooperative-qa}" \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  "$@"
