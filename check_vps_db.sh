#!/bin/bash
cd ~/affiliate-hub

echo "=== [1] ENV FILE DATABASE_URL ==="
grep -E 'DATABASE_URL|DIRECT_URL' .env | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/[REDACTED]@/g'

echo ""
echo "=== [2] PM2 PROCESSO NEXTJS (id 322) ==="
pm2 env 322 2>/dev/null | grep -E 'DATABASE_URL|DIRECT_URL|NODE_ENV|PORT' | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/[REDACTED]@/g' || echo "Nao foi possivel obter env do PM2 id 322"

echo ""
echo "=== [3] TABELAS NO BANCO (via DIRECT_URL) ==="
DBURL=$(grep '^DIRECT_URL' .env | cut -d'"' -f2)
psql "$DBURL" -c '\dt' 2>&1

echo ""
echo "=== [4] COLUNAS DA TABELA Product ==="
psql "$DBURL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='Product' ORDER BY ordinal_position;" 2>&1

echo ""
echo "=== [5] TOTAL DE PRODUTOS ==="
psql "$DBURL" -c 'SELECT COUNT(*) as total FROM "Product";' 2>&1

echo ""
echo "=== [6] COLUNAS DA TABELA Link ==="
psql "$DBURL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Link' ORDER BY ordinal_position;" 2>&1

echo ""
echo "=== [7] TABELAS QUE EXISTEM (lista completa) ==="
psql "$DBURL" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1
