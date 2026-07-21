#!/usr/bin/env node
// Verifica banco via Prisma Client (Node.js já instalado na VPS)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== [1] CONTAGEM DE PRODUTOS ===');
  const count = await prisma.product.count();
  console.log(`Total de produtos: ${count}`);

  console.log('\n=== [2] COLUNAS EXISTENTES (amostra de 1 produto) ===');
  const sample = await prisma.product.findFirst({ 
    include: { links: true, priceHistory: { take: 1 } }
  });
  if (sample) {
    console.log('Campos em Product:', Object.keys(sample).join(', '));
    if (sample.links) console.log('Campos em Link:', Object.keys(sample.links).join(', '));
  }

  console.log('\n=== [3] PRODUTOS COM externalId PREENCHIDO ===');
  const withExtId = await prisma.product.count({ where: { externalId: { not: null } } });
  console.log(`Com externalId: ${withExtId} / ${count}`);

  console.log('\n=== [4] PRODUTOS COM aiAnalysis PREENCHIDO ===');
  const withAI = await prisma.product.count({ where: { aiAnalysis: { not: null } } });
  console.log(`Com aiAnalysis: ${withAI} / ${count}`);

  console.log('\n=== [5] DISTRIBUIÇÃO POR STATUS ===');
  const byStatus = await prisma.product.groupBy({ by: ['status'], _count: true });
  byStatus.forEach(s => console.log(`  ${s.status}: ${s._count}`));

  console.log('\n=== [6] CAMPOS OPCIONAIS — VERIFICAR SE EXISTEM NO SCHEMA ATUAL ===');
  // Tenta acessar campos novos para ver se já existem
  try {
    await prisma.$queryRaw`SELECT "subcategory" FROM "Product" LIMIT 1`;
    console.log('subcategory: JÁ EXISTE ✅');
  } catch(e) { console.log('subcategory: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT "brand" FROM "Product" LIMIT 1`;
    console.log('brand: JÁ EXISTE ✅');
  } catch(e) { console.log('brand: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT "platformProductId" FROM "Product" LIMIT 1`;
    console.log('platformProductId: JÁ EXISTE ✅');
  } catch(e) { console.log('platformProductId: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT "aiProcessed" FROM "Product" LIMIT 1`;
    console.log('aiProcessed: JÁ EXISTE ✅');
  } catch(e) { console.log('aiProcessed: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT id FROM "ProductImage" LIMIT 1`;
    console.log('Tabela ProductImage: JÁ EXISTE ✅');
  } catch(e) { console.log('Tabela ProductImage: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT id FROM "ProductLink" LIMIT 1`;
    console.log('Tabela ProductLink: JÁ EXISTE ✅');
  } catch(e) { console.log('Tabela ProductLink: NÃO EXISTE ❌'); }

  try {
    await prisma.$queryRaw`SELECT id FROM "UserFavorite" LIMIT 1`;
    console.log('Tabela UserFavorite: JÁ EXISTE ✅');
  } catch(e) { console.log('Tabela UserFavorite: NÃO EXISTE ❌'); }

  console.log('\n=== [7] TODAS AS TABELAS NO BANCO ===');
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables 
    WHERE schemaname='public' ORDER BY tablename
  `;
  tables.forEach(t => console.log(' -', t.tablename));

  console.log('\n=== [8] PROCESSO NEXTJS — VARIÁVEL DATABASE_URL ===');
  console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 40) + '...[REDACTED]');
}

main()
  .catch(e => { console.error('ERRO:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
