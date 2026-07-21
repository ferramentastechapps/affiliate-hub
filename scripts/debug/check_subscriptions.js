const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.wslwizpasesubipifsic:S%28W4f37Db%29-kE%27tM@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  console.log('=== PWA SUBSCRIPTIONS IN DATABASE ===');
  const subs = await prisma.pushSubscription.findMany({
    take: 10,
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (subs.length === 0) {
    console.log('Nenhuma subscription encontrada no banco.');
  } else {
    subs.forEach((sub, i) => {
      console.log(`[Subscription ${i + 1}]`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  User: ${sub.user ? `${sub.user.name} (${sub.user.email})` : 'Anônimo'}`);
      console.log(`  Endpoint: ${sub.endpoint.substring(0, 60)}...`);
      console.log(`  Preferences:`, JSON.stringify(sub.preferences, null, 2));
      console.log('------------------------------------');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
