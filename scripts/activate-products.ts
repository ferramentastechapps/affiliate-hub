import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Buscando produtos no banco de dados...');
  const count = await prisma.product.count();
  console.log(`📊 Total de produtos no banco: ${count}`);

  if (count === 0) {
    console.log('🌱 Banco de dados vazio. Por favor, execute o seed primeiro ou vamos cadastrar alguns...');
  }

  const result = await prisma.product.updateMany({
    where: {
      status: 'pending',
    },
    data: {
      status: 'active',
    },
  });

  console.log(`✅ Atualizados ${result.count} produtos de 'pending' para 'active'.`);
  
  const activeCount = await prisma.product.count({
    where: { status: 'active' }
  });
  console.log(`📊 Total de produtos 'active': ${activeCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
