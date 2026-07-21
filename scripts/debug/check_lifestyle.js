const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== ÚLTIMOS 5 PRODUTOS COM ENHANCED IMAGE ===\n');
  
  const withEnhanced = await prisma.product.findMany({
    where: {
      enhancedImageUrl: { not: null }
    },
    select: {
      id: true,
      shortId: true,
      name: true,
      imageUrl: true,
      enhancedImageUrl: true,
      status: true,
      source: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  withEnhanced.forEach((p, i) => {
    console.log(`${i+1}. ${p.name.substring(0, 50)}`);
    console.log(`   ID: ${p.id} | ShortId: ${p.shortId}`);
    console.log(`   Status: ${p.status} | Source: ${p.source}`);
    console.log(`   imageUrl: ${p.imageUrl}`);
    console.log(`   enhancedImageUrl: ${p.enhancedImageUrl}`);
    console.log(`   Created: ${p.createdAt}`);
    console.log('');
  });
  
  console.log('\n=== ÚLTIMOS 5 PRODUTOS SEM ENHANCED IMAGE ===\n');
  
  const withoutEnhanced = await prisma.product.findMany({
    where: {
      enhancedImageUrl: null,
      createdAt: { gte: new Date(Date.now() - 3600000) } // última hora
    },
    select: {
      id: true,
      shortId: true,
      name: true,
      imageUrl: true,
      enhancedImageUrl: true,
      status: true,
      source: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  withoutEnhanced.forEach((p, i) => {
    console.log(`${i+1}. ${p.name.substring(0, 50)}`);
    console.log(`   ID: ${p.id} | ShortId: ${p.shortId}`);
    console.log(`   Status: ${p.status} | Source: ${p.source}`);
    console.log(`   imageUrl: ${p.imageUrl}`);
    console.log(`   enhancedImageUrl: ${p.enhancedImageUrl || 'NULL'}`);
    console.log(`   Created: ${p.createdAt}`);
    console.log('');
  });
  
  console.log('\n=== ESTATÍSTICAS ===\n');
  
  const stats = await prisma.product.aggregate({
    where: {
      createdAt: { gte: new Date(Date.now() - 86400000) } // últimas 24h
    },
    _count: { id: true }
  });
  
  const withEnhancedCount = await prisma.product.count({
    where: {
      enhancedImageUrl: { not: null },
      createdAt: { gte: new Date(Date.now() - 86400000) }
    }
  });
  
  const withoutEnhancedCount = stats._count.id - withEnhancedCount;
  const percentage = stats._count.id > 0 ? ((withEnhancedCount / stats._count.id) * 100).toFixed(1) : 0;
  
  console.log(`Total produtos (últimas 24h): ${stats._count.id}`);
  console.log(`Com enhancedImageUrl: ${withEnhancedCount} (${percentage}%)`);
  console.log(`Sem enhancedImageUrl: ${withoutEnhancedCount} (${100 - parseFloat(percentage)}%)`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
