import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTE: PRODUTOS NOVOS ---');
  // Buscar um produto com productLinks e imagens
  const newProduct = await prisma.product.findFirst({
    where: { productLinks: { some: {} } },
    include: { productLinks: true, images: true, links: true }
  });

  if (newProduct) {
    console.log(`✅ Produto Encontrado: ${newProduct.name}`);
    console.log(`✅ Brand: ${newProduct.brand}, Subcategoria: ${newProduct.subcategory}, PlatformID: ${newProduct.platformProductId}`);
    console.log(`✅ Imagens na galeria: ${newProduct.images.length}`);
    console.log(`✅ Links detalhados: ${newProduct.productLinks.length}`);
    if (newProduct.productLinks.length > 0) {
      console.log(`   Exemplo de Link -> Source: ${newProduct.productLinks[0].sourceUrl ? 'SIM' : 'NAO'}, Afiliado: ${newProduct.productLinks[0].affiliateUrl ? 'SIM' : 'NAO'}, Gerado: ${newProduct.productLinks[0].generatedAffiliateUrl ? 'SIM' : 'NAO'}`);
    }
  } else {
    console.log('❌ Nenhum produto novo com ProductLinks encontrado.');
  }

  console.log('\n--- TESTE: PRODUTOS ANTIGOS ---');
  // Buscar um produto sem productLinks
  const oldProduct = await prisma.product.findFirst({
    where: { productLinks: { none: {} } },
    include: { productLinks: true, images: true, links: true }
  });

  if (oldProduct) {
    console.log(`✅ Produto Antigo Encontrado: ${oldProduct.name}`);
    console.log(`✅ Possui links legados? ${oldProduct.links ? 'SIM' : 'NAO'}`);
  }

  console.log('\n--- TESTE: EDIÇÃO (API SIMULATION) ---');
  if (newProduct) {
    const updatedBrand = newProduct.brand + " (Editado)";
    
    await prisma.product.update({
      where: { id: newProduct.id },
      data: { brand: updatedBrand }
    });
    
    const verifyProduct = await prisma.product.findUnique({ where: { id: newProduct.id } });
    console.log(`✅ Brand editada para: ${verifyProduct?.brand}`);
    
    // Reverter
    await prisma.product.update({
      where: { id: newProduct.id },
      data: { brand: newProduct.brand }
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
