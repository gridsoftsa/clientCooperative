#!/usr/bin/env bash
# Actualización completa QA en el servidor (~/www) — rama GD.
# En el servidor: /home/ubuntu/www/deploy-update-qa.sh  (chmod +x)
#
# Uso manual:
#   GIT_BRANCH=GD ./deploy-update-qa.sh
#   # o, si el script ya tiene default GD:
#   ./deploy-update-qa.sh
#
# Remotos esperados (SSH):
#   apiCooperative-qa  → git@github.com:gridsoftsa/apiCooperative.git
#   clientCooperative-qa → git@github.com:gridsoftsa/clientCooperative.git
#
# Nota: las carpetas *-qa suelen ser git worktrees (.git es un ARCHIVO, no carpeta).
#   Por eso "cat .git/config" falla con "Not a directory". Usa: git remote -v
set -euo pipefail

WWW_ROOT="${WWW_ROOT:-/home/ubuntu/www}"
GIT_BRANCH="${GIT_BRANCH:-GD}"
API_DIR="$WWW_ROOT/apiCooperative-qa"
CLIENT_DIR="$WWW_ROOT/clientCooperative-qa"
COMPOSE_QA=(bash "$CLIENT_DIR/scripts/compose-qa.sh")
LOG_DIR="${LOG_DIR:-$WWW_ROOT/logs}"
LOCK_FILE="${LOCK_FILE:-/tmp/deploy-update-qa.lock}"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy-qa-$(date +%Y%m%d-%H%M%S).log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== deploy-update-qa $(date -Is) branch=$GIT_BRANCH ==="

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "ERROR: ya hay un deploy QA en curso (lock $LOCK_FILE)."
    exit 1
  fi
fi

for d in "$API_DIR" "$CLIENT_DIR"; do
  if [[ ! -d "$d" ]]; then
    echo "ERROR: No existe $d — crea el worktree en rama $GIT_BRANCH primero."
    exit 1
  fi
done

echo "→ Remotos / rama actual..."
git -C "$API_DIR" remote -v | head -2
git -C "$CLIENT_DIR" remote -v | head -2
git -C "$API_DIR" status -sb
git -C "$CLIENT_DIR" status -sb

echo "→ git fetch + pull ($GIT_BRANCH)..."
git -C "$API_DIR" fetch origin "$GIT_BRANCH"
git -C "$API_DIR" checkout "$GIT_BRANCH"
git -C "$API_DIR" pull --ff-only origin "$GIT_BRANCH"

git -C "$CLIENT_DIR" fetch origin "$GIT_BRANCH"
git -C "$CLIENT_DIR" checkout "$GIT_BRANCH"
git -C "$CLIENT_DIR" pull --ff-only origin "$GIT_BRANCH"

chmod +x "$CLIENT_DIR/scripts/compose-qa.sh" "$API_DIR/deploy-qa.sh" "$CLIENT_DIR/deploy-qa.sh" 2>/dev/null || true

echo "→ Deploy API QA (build + up)..."
(cd "$API_DIR" && ./deploy-qa.sh)

echo "→ Migraciones QA (con API arriba)..."
"${COMPOSE_QA[@]}" exec -T api php artisan migrate --force

echo "→ Deploy client QA..."
(cd "$CLIENT_DIR" && ./deploy-qa.sh)

echo "→ Estado contenedores QA:"
"${COMPOSE_QA[@]}" ps

echo "=== OK $(date -Is) log=$LOG_FILE ==="
