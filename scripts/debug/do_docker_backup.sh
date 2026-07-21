#!/bin/bash
cd ~/affiliate-hub
DBURL=$(grep '^DIRECT_URL' .env | cut -d'"' -f2)
docker run --rm postgres:17 pg_dump "$DBURL" --clean --if-exists --no-owner --no-privileges > /root/supabase_backup_fase1.sql
echo "Backup size:"
ls -lh /root/supabase_backup_fase1.sql
