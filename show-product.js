const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function show() {
  const produto = await prisma.product.findFirst({
    select: { id: true, shortId: true, name: true }
  });
  
  console.log('=== EXEMPLO DE PRODUTO ===');
  console.log('ID longo:', produto.id);
  console.log('shortId:', produto.shortId);
  console.log('Nome:', produto.name.substring(0, 60));
  console.log('');
  console.log('Link antigo:', `https://economizei.ftech-apps.com.br/produto/${produto.id}`);
  console.log('Link novo:', `https://economizei.ftech-apps.com.br/produto/${produto.shortId}`);
  
  await prisma.$disconnect();
}

show();
