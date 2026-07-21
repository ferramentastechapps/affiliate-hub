const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const produtos = await prisma.product.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, shortId: true, name: true }
  });
  
  console.log('=== ÚLTIMOS 10 PRODUTOS ===\n');
  produtos.forEach(p => {
    console.log(`shortId: ${p.shortId} | Nome: ${p.name.substring(0, 50)}`);
    console.log(`Link: https://economizei.ftech-apps.com.br/produto/${p.shortId}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

list();
