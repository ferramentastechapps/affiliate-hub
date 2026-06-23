const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  console.log("Executando SQL para apagar todas as tabelas...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ProductImage" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ProductLink" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "UserFavorite" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "PriceHistory" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Coupon" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Comment" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ProductVote" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ProductAlert" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ActivityLog" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "PushSubscription" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Link" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Product" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Campaign" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Banner" CASCADE;`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Product_shortId_seq" RESTART WITH 1;`);

  console.log("Tabelas limpas!");
  const prodCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "Product";`);
  const userCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "User";`);
  
  console.log("Contagem final:");
  console.log("Produtos:", prodCount[0].count.toString());
  console.log("Usuarios:", userCount[0].count.toString());
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
