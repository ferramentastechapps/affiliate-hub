const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando produtos...');
  
  const products = await prisma.product.findMany({
    where: {
      productLinks: {
        some: {
          platform: 'mercadoLivre'
        }
      }
    },
    include: {
      productLinks: true
    }
  });
  
  console.log('Encontrados', products.length, 'produtos com links do ML.');
  
  let updatedCount = 0;
  
  for (const product of products) {
    let changed = false;
    
    if (product.productLinks) {
      for (const link of product.productLinks) {
        if (link.platform === 'mercadoLivre') {
          let newGen = link.generatedAffiliateUrl || '';
          let newAff = link.affiliateUrl || '';
          
          if (newGen.includes('matt_word=economizei') || newGen.includes('matt_word=23105944')) {
            newGen = newGen.replace(/matt_word=(economizei|23105944)/g, 'matt_word=nojo4941928');
            await prisma.productLink.update({
              where: { id: link.id },
              data: { generatedAffiliateUrl: newGen }
            });
            changed = true;
          }
          
          if (newAff.includes('matt_word=economizei') || newAff.includes('matt_word=23105944')) {
            newAff = newAff.replace(/matt_word=(economizei|23105944)/g, 'matt_word=nojo4941928');
            await prisma.productLink.update({
              where: { id: link.id },
              data: { affiliateUrl: newAff }
            });
            changed = true;
          }
        }
      }
    }
    
    if (changed) updatedCount++;
  }
  
  console.log('Atualizados os links de', updatedCount, 'produtos com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
