#!/bin/bash

echo "Deploying to server..."

# Push to GitHub
git add .
git commit -m "${1:-deploy update}" 2>/dev/null || echo "Nothing new to commit, deploying existing code..."
git push origin main

# SSH into server: hard-reset to match git exactly, run migrations, build, restart
ssh -i ~/.ssh/id_ed25519 root@162.248.162.24 << 'EOF'
cd /root/secureconnect

git fetch origin
git reset --hard origin/main

echo "Running migrations..."
for f in backend/db/migrate_*.sql; do
  PGPASSWORD=SecureConnect_db_2024 psql -U secureconnect -d secureconnect -h localhost -f "$f" 2>/dev/null
done

cd frontend && npm run build
pm2 restart all
echo "Deploy complete!"
EOF
