const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      category: true,
    },
    orderBy: {
      _count: {
        category: 'desc',
      },
    },
  });
  console.log("=== Categorias Atuais no Banco ===");
  categories.forEach(c => {
    console.log(`- ${c.category} (${c._count.category} produtos)`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
