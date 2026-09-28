import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { Footer } from '@/components/Footer';
import { ProductGridStatic } from '@/components/ProductGridStatic';
import type { Product } from '@/components/ProductCard';

export const revalidate = 3600; // Atualiza o cache de hora em hora

type Props = {
  params: Promise<{ slug: string }>;
};

// Formata o produto do Prisma para a interface do Frontend (ProductCard)
function formatToProduct(p: any): Product {
  return {
    id: p.id,
    shortId: p.shortId,
    name: p.name,
    category: p.category || 'Geral',
    imageUrl: p.imageUrl,
    enhancedImageUrl: p.enhancedImageUrl,
    storeName: p.storeName,
    price: p.price,
    description: p.description,
    coupons: p.coupons || [],
    links: {
      amazon: p.links?.amazon,
      mercadoLivre: p.links?.mercadoLivre,
      shopee: p.links?.shopee,
      aliexpress: p.links?.aliexpress,
      tiktok: p.links?.tiktok,
    },
  };
}

// Helper para buscar nome real da categoria no BD via slug
async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['active', 'approved'] }, category: { not: null } },
    select: { category: true },
    distinct: ['category']
  });

  for (const p of products) {
    if (p.category && slugify(p.category) === slug) return p.category;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = await getCategoryNameBySlug(slug);

  if (!categoryName) {
    return { title: 'Categoria não encontrada | Economizei' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';
  const displayTitle = `Promoções de ${categoryName}: Ofertas Hoje - Economizei`;
  const displayDesc = `Economize em ${categoryName} com cupons e descontos exclusivos validados. Veja a lista dos melhores preços ativos hoje!`;

  return {
    title: displayTitle,
    description: displayDesc,
    alternates: {
      canonical: `${siteUrl}/categoria/${slug}`
    },
    openGraph: {
      title: displayTitle,
      description: displayDesc,
      url: `${siteUrl}/categoria/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: displayDesc,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const categoryName = await getCategoryNameBySlug(slug);

  if (!categoryName) {
    notFound();
  }

  const rawProducts = await prisma.product.findMany({
    where: {
      status: { in: ['active', 'approved'] },
      category: categoryName
    },
    orderBy: { updatedAt: 'desc' },
    include: { links: true, coupons: true }
  });

  const products = rawProducts.map(formatToProduct);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Promoções Atuais de ${categoryName}`,
    description: `Descubra descontos imbatíveis em produtos da categoria ${categoryName}.`,
    itemListElement: products.map((prod, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: prod.name,
        url: `${siteUrl}/produto/${prod.shortId || prod.id}`,
        image: prod.enhancedImageUrl || prod.imageUrl,
        category: categoryName,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: prod.price ? prod.price.toFixed(2) : undefined,
          availability: 'https://schema.org/InStock'
        }
      }
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-black text-white pt-20">
        <ProductGridStatic
          products={products}
          title={`Ofertas de ${categoryName}`}
          subtitle={`Há ${products.length} ofertas ativas para a categoria ${categoryName}. Preços podem alterar a qualquer momento.`}
        />
      </main>
      <Footer />
    </>
  );
}
