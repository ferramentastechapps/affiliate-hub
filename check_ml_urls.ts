import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT "generatedAffiliateUrl"
    FROM "ProductLink"
    WHERE platform = 'mercadoLivre'
    AND "generatedAffiliateUrl" LIKE '%matt_tool%'
    ORDER BY "createdAt" DESC
    LIMIT 1;
  `);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
