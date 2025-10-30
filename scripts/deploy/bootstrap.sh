#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
NEXTAUTH_SECRET="${2:-}"
DOMAIN="${3:-}"

if [ -z "${REPO_URL}" ] || [ -z "${NEXTAUTH_SECRET}" ]; then
  echo "Usage: bootstrap.sh <REPO_URL> <NEXTAUTH_SECRET> [DOMAIN]" >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker root || true
fi

ufw allow 22 || true
ufw allow 80 || true
ufw allow 443 || true
ufw --force enable || true

mkdir -p /opt/legalflow && cd /opt/legalflow

if [ ! -d .git ]; then
  git clone "$REPO_URL" .
else
  git fetch --all && git reset --hard origin/main
fi

SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
if [ ! -f .env ]; then
  cat > .env <<EOF
NEXTAUTH_URL=http://${DOMAIN:-$SERVER_IP}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
DATABASE_URL=postgresql://postgres:postgres@db:5432/legalflow?schema=public
EOF
fi

# If DOMAIN is set, flip NEXTAUTH_URL to https
if [ -n "$DOMAIN" ]; then
  sed -i "s#^NEXTAUTH_URL=.*#NEXTAUTH_URL=https://$DOMAIN#g" .env || true
fi

# Bring up stack and run migrations
if command -v docker compose >/dev/null 2>&1; then
  docker compose up -d --build
  docker compose exec -T web pnpm -F @legalflow/db prisma migrate deploy || true
else
  docker-compose up -d --build
  docker-compose exec -T web pnpm -F @legalflow/db prisma migrate deploy || true
fi

echo
if [ -n "$DOMAIN" ]; then
  echo "Deployed. Visit: https://$DOMAIN"
else
  echo "Deployed. Visit: http://$SERVER_IP"
fi
