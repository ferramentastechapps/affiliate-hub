-- Migration: add_pague_menos_link
-- Adiciona coluna pagueMenos ao modelo Link para links de afiliado da Pague Menos

ALTER TABLE "Link" ADD COLUMN "pagueMenos" TEXT;
