import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

export async function TaxonomyLinks() {
  // Buscar os 20 produtos mais recentes para pegar as top categorias e lojas ativas
  const recentProducts = await prisma.product.findMany({
    where: { status: { in: ['active', 'approved'] } },
    select: { category: true, storeName: true, platformType: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const categories = new Set<string>();
  const stores = new Set<string>();

  recentProducts.forEach((p) => {
    if (p.category) categories.add(p.category);
    if (p.storeName) stores.add(p.storeName);
    if (p.platformType) stores.add(p.platformType);
  });

  const categoriesList = Array.from(categories).slice(0, 8); // top 8
  const storesList = Array.from(stores).slice(0, 8); // top 8

  if (categoriesList.length === 0 && storesList.length === 0) return null;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-16 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">Promoções por Categoria</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {categoriesList.map((cat) => (
              <Link
                key={cat}
                href={`/categoria/${slugify(cat)}`}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">Ofertas por Lojas</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {storesList.map((store) => (
              <Link
                key={store}
                href={`/loja/${slugify(store)}`}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white"
              >
                {store}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
