#!/bin/bash
cd ~/affiliate-hub
DBURL=$(grep '^DIRECT_URL' .env | cut -d'"' -f2)

echo "Iniciando backup via pg_dump..."
pg_dump "$DBURL" --clean --if-exists --no-owner --no-privileges -f /root/supabase_backup_fase1.sql
if [ $? -eq 0 ]; then
  echo "Backup concluido em /root/supabase_backup_fase1.sql"
else
  echo "Falha no backup!"
  exit 1
fi
