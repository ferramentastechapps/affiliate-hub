import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductDetail } from '@/components/ProductDetail';
import { Footer } from '@/components/Footer';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const isNumeric = /^\d+$/.test(id);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(id, 10) } : { id },
      include: { links: true }
    });

    if (!product) {
      return { title: 'Produto não encontrado | Economizei' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';
    const rawImage = product.enhancedImageUrl || product.imageUrl;
    const shareImage = rawImage?.startsWith('/')
      ? `${siteUrl}${rawImage}`
      : (rawImage || `${siteUrl}/placeholder.webp`);

    return {
      title: `${product.name} | Economizei`,
      description: product.description || `Compre ${product.name} com o melhor preço. Aproveite cupons de desconto exclusivos!`,
      openGraph: {
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [{ url: shareImage }],
        type: 'website',
        url: `${siteUrl}/produto/${product.shortId || product.id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [shareImage],
      },
    };
  } catch (error) {
    return { title: 'Produto não encontrado | Economizei' };
  }
}

// ─── JSON-LD Schema.org Builder ──────────────────────────────────────────────
function buildProductJsonLd(product: any): object {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';
  const productUrl = `${siteUrl}/produto/${product.shortId || product.id}`;

  const links = product.links || {};
  const productLinks = product.productLinks || [];
  
  // Lista todas as ofertas disponíveis por loja
  const offersList: any[] = [];
  const validUntilDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (productLinks.length > 0) {
    for (const pl of productLinks) {
      const url = pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl;
      if (url) {
        offersList.push({
          '@type': 'Offer',
          url,
          priceCurrency: 'BRL',
          price: product.price ? product.price.toFixed(2) : undefined,
          priceValidUntil: validUntilDate,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: pl.platform ? pl.platform.charAt(0).toUpperCase() + pl.platform.slice(1) : 'Economizei',
          },
        });
      }
    }
  }

  // Se não houver productLinks, usa links legados
  if (offersList.length === 0 && product.price) {
    offersList.push({
      '@type': 'Offer',
      url: links.amazon || links.mercadoLivre || links.shopee || productUrl,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      priceValidUntil: validUntilDate,
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Economizei',
      },
    });
  }

  const jsonLd: any = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — oferta exclusiva no Economizei`,
    image: [product.imageUrl],
    url: productUrl,
    category: product.category,
    sku: product.platformId || product.platformProductId || String(product.shortId || product.id),
  };

  // Marca
  if (product.brand) {
    jsonLd.brand = { '@type': 'Brand', name: product.brand };
  }

  // Modelo
  if (product.model) {
    jsonLd.model = product.model;
  }

  // Avaliação média agregada
  if (product.reviewScore && product.reviewCount) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.reviewScore.toString(),
      reviewCount: product.reviewCount.toString(),
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Avaliações individuais (reviews)
  if (product.reviews && product.reviews.length > 0) {
    jsonLd.review = product.reviews.map((rev: any) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.authorName || 'Cliente Verificado',
      },
      datePublished: rev.publishedAt ? new Date(rev.publishedAt).toISOString().slice(0, 10) : undefined,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rev.rating.toString(),
        bestRating: '5',
        worstRating: '1',
      },
      reviewBody: rev.comment || '',
    }));
  }

  // Ofertas (múltiplas lojas ou individual)
  if (offersList.length > 1 && product.price) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: product.price.toFixed(2),
      highPrice: (product.originalPrice || product.price * 1.2).toFixed(2),
      offerCount: offersList.length,
      offers: offersList,
    };
  } else if (offersList.length === 1) {
    jsonLd.offers = offersList[0];
  }

  return jsonLd;
}

interface LowestPriceInfo {
  isLowest: boolean;
  days: number;
  minPrice: number;
  maxPrice: number;
  savings: number;
}

function calculateLowestPriceInfo(
  price: number | null | undefined,
  originalPrice: number | null | undefined,
  priceHistory?: Array<{ price: number; originalPrice?: number | null; createdAt: Date | string }>
): LowestPriceInfo | null {
  if (!price || price <= 0 || !priceHistory || priceHistory.length === 0) {
    return null;
  }

  const historyPrices = priceHistory.map(h => h.price);
  const minPrice = Math.min(...historyPrices);
  const maxPrice = Math.max(
    ...priceHistory.map(h => h.originalPrice || h.price),
    originalPrice || price
  );

  // Preço atual é menor ou igual ao mínimo com 1% de margem
  if (price <= minPrice * 1.01) {
    const oldest = priceHistory[priceHistory.length - 1].createdAt;
    const daysDiff = Math.max(
      30,
      Math.floor((Date.now() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      isLowest: true,
      days: daysDiff,
      minPrice,
      maxPrice,
      savings: maxPrice > price ? Math.round((maxPrice - price) * 100) / 100 : 0,
    };
  }

  return null;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  try {
    const isNumeric = /^\d+$/.test(id);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(id, 10) } : { id },
      include: {
        links: true,
        coupons: true,
        productLinks: true,
        priceHistory: { orderBy: { createdAt: 'desc' } },
        reviews: { orderBy: { rating: 'desc' }, take: 5 },
      }
    });

    if (!product) {
      notFound();
    }

    const lowestPriceInfo = calculateLowestPriceInfo(
      product.price,
      product.originalPrice,
      product.priceHistory
    );

    const jsonLd = buildProductJsonLd(product);

    return (
      <>
        {/* JSON-LD Structured Data para Google Shopping e Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetail product={product} lowestPriceInfo={lowestPriceInfo} />
        <Footer />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
