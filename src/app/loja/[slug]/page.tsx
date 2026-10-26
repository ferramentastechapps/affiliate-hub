import { cache } from 'react';
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

// Helper com cache para buscar nome real da loja no BD via slug
const getStoreNameBySlug = cache(async (slug: string): Promise<string | null> => {
  const [stores, platforms] = await Promise.all([
    prisma.product.findMany({
      where: { status: { in: ['active', 'approved'] }, storeName: { not: null } },
      select: { storeName: true },
      distinct: ['storeName'],
    }),
    prisma.product.findMany({
      where: { status: { in: ['active', 'approved'] }, platformType: { not: null } },
      select: { platformType: true },
      distinct: ['platformType'],
    }),
  ]);

  for (const p of stores) {
    if (p.storeName && slugify(p.storeName) === slug) return p.storeName;
  }
  for (const p of platforms) {
    if (p.platformType && slugify(p.platformType) === slug) return p.platformType;
  }
  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const storeName = await getStoreNameBySlug(slug);

  if (!storeName) {
    return { title: 'Loja não encontrada | Economizei' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';
  const displayTitle = `Cupons e Promoções ${storeName} - Economizei`;
  const displayDesc = `As melhores promoções e cupons de desconto ativos para ${storeName}. Economize hoje mesmo!`;

  return {
    title: displayTitle,
    description: displayDesc,
    alternates: {
      canonical: `${siteUrl}/loja/${slug}`
    },
    openGraph: {
      title: displayTitle,
      description: displayDesc,
      url: `${siteUrl}/loja/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: displayDesc,
    },
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const storeName = await getStoreNameBySlug(slug);

  if (!storeName) {
    notFound();
  }

  const whereClause = {
    status: { in: ['active', 'approved'] },
    OR: [
      { storeName: storeName },
      { platformType: storeName },
    ],
  };

  const [totalCount, rawProducts] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 48,
      include: { links: true, coupons: true },
    }),
  ]);

  const products = rawProducts.map(formatToProduct);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Melhores Ofertas de ${storeName}`,
    description: `As melhores promoções e cupons de desconto na plataforma ou loja ${storeName}`,
    itemListElement: products.map((prod, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: prod.name,
        url: `${siteUrl}/produto/${prod.shortId || prod.id}`,
        image: prod.enhancedImageUrl || prod.imageUrl,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: prod.price ? prod.price.toFixed(2) : undefined,
          availability: 'https://schema.org/InStock'
        }
      }
    }))
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: storeName,
        item: `${siteUrl}/loja/${slug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main className="min-h-screen bg-black text-white pt-20">
        <ProductGridStatic
          products={products}
          title={`Promoções e Cupons: ${storeName}`}
          subtitle={
            totalCount > 48
              ? `Exibindo as 48 melhores ofertas recentes de ${totalCount} disponíveis na plataforma ${storeName}.`
              : `Encontramos ${totalCount} oferta(s) ativas desta loja.`
          }
        />
      </main>
      <Footer />
    </>
  );
}
