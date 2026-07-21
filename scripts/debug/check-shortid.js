const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const semShortId = await prisma.product.count({ 
    where: { shortId: null } 
  });
  
  const comShortId = await prisma.product.count({ 
    where: { shortId: { not: null } } 
  });
  
  console.log('Produtos SEM shortId:', semShortId);
  console.log('Produtos COM shortId:', comShortId);
  
  // Pegar um exemplo de produto COM shortId
  const exemplo = await prisma.product.findFirst({
    where: { shortId: { not: null } },
    select: { id: true, shortId: true, name: true }
  });
  
  if (exemplo) {
    console.log('\nExemplo de produto:');
    console.log('ID:', exemplo.id);
    console.log('shortId:', exemplo.shortId);
    console.log('Nome:', exemplo.name.substring(0, 50));
  }
  
  await prisma.$disconnect();
}

check();
