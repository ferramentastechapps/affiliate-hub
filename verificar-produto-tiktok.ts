import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarProdutoTikTok() {
  try {
    console.log('🔍 Buscando produtos do TikTok...\n');
    
    // Buscar produtos com link do TikTok
    const produtos = await prisma.product.findMany({
      where: {
        links: {
          tiktok: {
            not: null
          }
        }
      },
      include: {
        links: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (produtos.length === 0) {
      console.log('❌ Nenhum produto do TikTok encontrado no banco!');
      console.log('\n📊 Verificando todos os produtos recentes...\n');
      
      const todosRecentes = await prisma.product.findMany({
        include: {
          links: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });
      
      console.log(`Total de produtos recentes: ${todosRecentes.length}\n`);
      todosRecentes.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Categoria: ${p.category}`);
        console.log(`   Preço: R$ ${p.price}`);
        console.log(`   Criado: ${p.createdAt}`);
        console.log(`   Links: ${JSON.stringify(p.links, null, 2)}`);
        console.log('');
      });
    } else {
      console.log(`✅ Encontrados ${produtos.length} produtos do TikTok:\n`);
      
      produtos.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Categoria: ${p.category}`);
        console.log(`   Preço: R$ ${p.price}`);
        console.log(`   Link TikTok: ${p.links?.tiktok}`);
        console.log(`   Criado: ${p.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarProdutoTikTok();
