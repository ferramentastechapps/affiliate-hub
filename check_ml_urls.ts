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
    SELECT 
      p.name as title,
      p.status,
      p."createdAt",
      p."updatedAt",
      pl."sourceUrl",
      pl."generatedAffiliateUrl"
    FROM "ProductLink" pl
    JOIN "Product" p ON p.id = pl."productId"
    WHERE pl."generatedAffiliateUrl" LIKE '%MLB4381407875%'
       OR pl."sourceUrl" LIKE '%MLB4381407875%';
  `);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
