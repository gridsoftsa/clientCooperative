#!/usr/bin/env bash
# Despliegue del cliente Nuxt en Docker.
# Ejecutar desde la raíz del repo: /home/ubuntu/www/cooperative
# Uso: ./clientCooperative/deploy.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "→ Build sin caché (context: clientCooperative/)..."
sudo docker compose -f "$REPO_ROOT/clientCooperative/docker-compose.yml" build --no-cache client

echo "→ Recreando contenedor para usar la nueva imagen..."
sudo docker compose -f "$REPO_ROOT/clientCooperative/docker-compose.yml" up -d client

echo "→ Listo. Ver logs: sudo docker compose -f $REPO_ROOT/clientCooperative/docker-compose.yml logs -f client"
