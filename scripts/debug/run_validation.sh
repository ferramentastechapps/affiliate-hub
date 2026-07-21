#!/bin/bash
cd ~/affiliate-hub
source .env
echo "=== Testando Banco de Dados no Postgres ==="
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"ProductReview\";"
psql "$DATABASE_URL" -c "\d \"ProductAlert\";"
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'ProductAlert';"
echo "=== PM2 Status e Logs ==="
pm2 status
pm2 logs nextjs --lines 10 --nostream
