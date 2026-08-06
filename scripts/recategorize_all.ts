import { prisma } from '../src/lib/prisma';
import { detectSmartCategory } from '../src/lib/category-detector';

async function main() {
  console.log('🔄 Iniciando re-categorização dos produtos no banco de dados...');
  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true, category: true }
  });

  console.log(`📦 Encontrados ${products.length} produtos para verificação.`);

  let updatedCount = 0;
  for (const product of products) {
    const newCategory = detectSmartCategory(product.name, product.description || '', product.category);
    if (newCategory !== product.category) {
      console.log(`✨ Atualizando [${product.name.substring(0, 45)}...]: "${product.category}" ➔ "${newCategory}"`);
      await prisma.product.update({
        where: { id: product.id },
        data: { category: newCategory }
      });
      updatedCount++;
    }
  }

  console.log(`✅ Processo concluído! ${updatedCount} produtos foram atualizados com novas categorias.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
