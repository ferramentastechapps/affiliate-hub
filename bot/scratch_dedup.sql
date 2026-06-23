-- SQL para desativar produtos duplicados ativos/aprovados mantendo apenas o mais antigo.

-- 1. Deduplicação por chave composta externalId + source
WITH duplicates_by_key AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY "externalId", "source" ORDER BY "createdAt" ASC) as rn
    FROM "Product"
    WHERE "externalId" IS NOT NULL 
      AND "source" IS NOT NULL
      AND status IN ('active', 'approved')
)
UPDATE "Product"
SET status = 'rejected'
WHERE id IN (
    SELECT id 
    FROM duplicates_by_key 
    WHERE rn > 1
);

-- 2. Deduplicação por nome idêntico (case-insensitive) mantendo o registro mais antigo
WITH duplicates_by_name AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY "createdAt" ASC) as rn
    FROM "Product"
    WHERE status IN ('active', 'approved')
)
UPDATE "Product"
SET status = 'rejected'
WHERE id IN (
    SELECT id 
    FROM duplicates_by_name 
    WHERE rn > 1
);
