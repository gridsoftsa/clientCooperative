#!/usr/bin/env bash
# Actualización completa QA en el servidor (~/www).
# Copiar a /home/ubuntu/www/deploy-update-qa.sh y chmod +x
#
# Requisitos previos:
#   git worktree add ../apiCooperative-qa qa
#   git worktree add ../clientCooperative-qa qa
#   cp apiCooperative/.env.qa.example → apiCooperative-qa/.env (y php artisan key:generate)
#   cp clientCooperative/.env.qa.example → clientCooperative-qa/.env
set -euo pipefail

WWW_ROOT="${WWW_ROOT:-/home/ubuntu/www}"
GIT_BRANCH="${GIT_BRANCH:-qa}"
API_DIR="$WWW_ROOT/apiCooperative-qa"
CLIENT_DIR="$WWW_ROOT/clientCooperative-qa"
COMPOSE_QA=(bash "$CLIENT_DIR/scripts/compose-qa.sh")

for d in "$API_DIR" "$CLIENT_DIR"; do
  if [[ ! -d "$d" ]]; then
    echo "ERROR: No existe $d — crea el worktree en rama $GIT_BRANCH primero."
    exit 1
  fi
done

echo "→ git pull ($GIT_BRANCH)..."
git -C "$API_DIR" pull origin "$GIT_BRANCH"
git -C "$CLIENT_DIR" pull origin "$GIT_BRANCH"

chmod +x "$CLIENT_DIR/scripts/compose-qa.sh" "$API_DIR/deploy-qa.sh" "$CLIENT_DIR/deploy-qa.sh" 2>/dev/null || true

echo "→ Migraciones QA..."
"${COMPOSE_QA[@]}" exec -T api php artisan migrate --force

echo "→ Deploy API QA..."
(cd "$API_DIR" && ./deploy-qa.sh)

echo "→ Deploy client QA..."
(cd "$CLIENT_DIR" && ./deploy-qa.sh) || true

echo "→ Estado contenedores QA:"
"${COMPOSE_QA[@]}" ps
