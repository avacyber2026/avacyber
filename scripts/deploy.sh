#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "==> Installing dependencies..."
npm install
(cd frontend && npm install --legacy-peer-deps)
(cd backend && npm install)
(cd landing && npm install)

echo "==> Building frontend (clean)..."
(cd frontend && rm -rf .next && npm run build)

echo "==> Building landing (clean)..."
(cd landing && rm -rf .next && npm run build)

echo "==> Starting services with PM2..."
ECOSYSTEM="$(cd "$(dirname "$0")/.." && pwd)/ecosystem.config.js"
if pm2 describe secureconnect-backend &>/dev/null; then
  pm2 restart "$ECOSYSTEM" --update-env
  echo "==> Restarted PM2 apps (domain will serve new build)."
else
  pm2 start "$ECOSYSTEM"
  echo "==> Started PM2 apps."
fi

pm2 save 2>/dev/null || true
echo ""
echo "==> Deploy complete."
echo "    Backend:  http://localhost:3020"
echo "    Frontend: http://localhost:3000"
echo "    Landing:  http://localhost:3001"
echo "    With nginx: app.ava-cyber.com (frontend), api.ava-cyber.com (backend), landing.ava-cyber.com (landing)"
