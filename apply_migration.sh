#!/bin/bash
cd ~/affiliate-hub
DBURL=$(grep '^DIRECT_URL' .env | cut -d'"' -f2)
npx prisma db execute --url "$DBURL" --file /tmp/fase1_migration.sql
