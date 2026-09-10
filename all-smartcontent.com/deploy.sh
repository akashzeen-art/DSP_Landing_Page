#!/usr/bin/env bash
# Deploy LP13_GOG_UAE → all-smartcontent.com
# Usage:
#   ./deploy.sh
#   SSH_USER=root SSH_PORT=5550 ./deploy.sh
set -euo pipefail

HOST="${SSH_HOST:-160.187.80.197}"
PORT="${SSH_PORT:-5550}"
USER="${SSH_USER:-root}"
REMOTE_BASE="/var/www/vaszeen/zeen_lp/all-smartcontent.com"
LP_NAME="LP13_GOG_UAE"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_LP="${SCRIPT_DIR}/${LP_NAME}"

if [[ ! -d "$LOCAL_LP" ]]; then
  echo "Missing local folder: $LOCAL_LP"
  exit 1
fi

echo "→ Creating remote path ${REMOTE_BASE}/${LP_NAME}"
ssh -p "$PORT" "${USER}@${HOST}" "mkdir -p '${REMOTE_BASE}/${LP_NAME}'"

echo "→ Uploading files via rsync"
rsync -avz --delete \
  -e "ssh -p ${PORT}" \
  --exclude '.DS_Store' \
  --exclude '__pycache__' \
  --exclude 'serve.py' \
  "${LOCAL_LP}/" \
  "${USER}@${HOST}:${REMOTE_BASE}/${LP_NAME}/"

echo "→ Fixing ownership"
ssh -p "$PORT" "${USER}@${HOST}" "chown -R www-data:www-data '${REMOTE_BASE}/${LP_NAME}' || chown -R nginx:nginx '${REMOTE_BASE}/${LP_NAME}' || true"

echo "→ Smoke tests"
ssh -p "$PORT" "${USER}@${HOST}" "ls -la '${REMOTE_BASE}/${LP_NAME}' | head"
curl -sS -k -o /dev/null -w "LP HTTP: %{http_code}\n" "http://all-smartcontent.com/${LP_NAME}/" || true
curl -sS -k -o /dev/null -w "php-test: %{http_code}\n" "http://all-smartcontent.com/${LP_NAME}/php-test.php" || true

echo "Done."
echo "Live: https://all-smartcontent.com/${LP_NAME}/?clickid=TEST123"
echo "If SSL warning / wrong cert, install nginx vhost + certbot (see nginx-all-smartcontent.com.conf)"
