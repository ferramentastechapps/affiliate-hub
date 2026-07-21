// Script para corrigir produtos de agregadores criados antes do deploy
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function corrigirProdutos() {
  console.log('🔍 Buscando produtos de agregadores com IDs incorretos...\n');
  
  // Buscar produtos com platformType de agregador
  const produtos = await prisma.product.findMany({
    where: {
      OR: [
        { platformType: 'promobit' },
        { platformType: 'pechinchou' }
      ]
    },
    select: {
      id: true,
      name: true,
      platformId: true,
      platformType: true,
      status: true,
      source: true
    }
  });
  
  console.log(`✅ Encontrados ${produtos.length} produto(s) de agregadores:\n`);
  
  produtos.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.name}`);
    console.log(`   platformId: ${p.platformId}`);
    console.log(`   platformType: ${p.platformType}`);
    console.log(`   status: ${p.status}`);
    console.log('');
  });
  
  console.log('🔧 Corrigindo produtos...\n');
  
  let corrigidos = 0;
  
  for (const produto of produtos) {
    // Se o produto tem platformId mas é de agregador, precisa correção
    if (produto.platformId && (produto.platformType === 'promobit' || produto.platformType === 'pechinchou')) {
      await prisma.product.update({
        where: { id: produto.id },
        data: {
          platformId: null, // Remove ID incorreto do agregador
          status: 'pending' // Força pending para revisão manual
        }
      });
      
      console.log(`✅ Corrigido: ${produto.name.substring(0, 50)}...`);
      console.log(`   platformId: ${produto.platformId} → null`);
      console.log(`   status: ${produto.status} → pending`);
      console.log('');
      
      corrigidos++;
    }
  }
  
  console.log(`\n✨ Total corrigido: ${corrigidos} produto(s)`);
  console.log(`\n⚠️  Estes produtos agora estão com status 'pending' e precisam de aprovação manual no admin.`);
  console.log(`   Acesse: https://economizei.ftech-apps.com.br/admin/products`);
  console.log(`   Os produtos terão badge laranja "AGREGADOR - Revisar Link"`);
  
  process.exit(0);
}

corrigirProdutos().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
