#!/usr/bin/env bash
set -euo pipefail
echo "🔥 Powergas setup"
cp -n backend/.env.example backend/.env || true
cp -n frontend/.env.example frontend/.env || true
echo "→ Starting infrastructure (postgres, redis, minio)..."
docker-compose -f infrastructure/docker-compose.yml up -d postgres redis minio
echo "→ Installing backend deps..."
(cd backend && npm install)
echo "→ Running migrations + seed..."
(cd backend && npm run migration:run && npm run seed)
echo "✅ Done. Run 'cd backend && npm run start:dev'"
