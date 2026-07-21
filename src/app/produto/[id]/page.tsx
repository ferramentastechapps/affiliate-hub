import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductDetail } from '@/components/ProductDetail';
import { Header } from '@/components/Header';
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
      where: isNumeric ? { shortId: parseInt(id) } : { id },
      include: { links: true }
    });

    if (!product) {
      return { title: 'Produto não encontrado | Economizei' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

    return {
      title: `${product.name} | Economizei`,
      description: product.description || `Compre ${product.name} com o melhor preço. Aproveite cupons de desconto exclusivos!`,
      openGraph: {
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [{ url: product.imageUrl }],
        type: 'website',
        url: `${siteUrl}/produto/${product.shortId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [product.imageUrl],
      },
    };
  } catch (error) {
    return { title: 'Produto não encontrado | Economizei' };
  }
}

// ─── JSON-LD Schema.org Builder ──────────────────────────────────────────────
function buildProductJsonLd(product: any): object {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';
  const productUrl = `${siteUrl}/produto/${product.shortId}`;

  // Determina o link de compra (prioridade: amazon > mercadoLivre > shopee > primeiro disponível)
  const links = product.links || {};
  const productLinks = product.productLinks || [];
  const getPlatformUrl = (platform: string) => {
    const pl = productLinks.find((l: any) => l.platform === platform && (l.affiliateUrl || l.generatedAffiliateUrl));
    return pl ? (pl.affiliateUrl || pl.generatedAffiliateUrl) : links[platform] || null;
  };
  const offerUrl = getPlatformUrl('amazon') || getPlatformUrl('mercadoLivre') || getPlatformUrl('shopee') || productUrl;

  const jsonLd: any = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — oferta exclusiva no Economizei`,
    image: [product.imageUrl],
    url: productUrl,
    category: product.category,
  };

  // Marca (se disponível)
  if (product.brand) {
    jsonLd.brand = { '@type': 'Brand', name: product.brand };
  }

  // Modelo (se disponível)
  if (product.model) {
    jsonLd.model = product.model;
  }

  // Avaliações (se houver reviewScore)
  if (product.reviewScore && product.reviewCount) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.reviewScore.toString(),
      reviewCount: product.reviewCount.toString(),
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Oferta de preço (se houver preço)
  if (product.price) {
    jsonLd.offers = {
      '@type': 'Offer',
      url: offerUrl,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Economizei',
      },
    };
  }

  return jsonLd;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  try {
    const isNumeric = /^\d+$/.test(id);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(id) } : { id },
      include: {
        links: true,
        coupons: true,
        productLinks: true,
      }
    });

    if (!product) {
      notFound();
    }

    const jsonLd = buildProductJsonLd(product);

    return (
      <>
        {/* JSON-LD Structured Data para Google Shopping e Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <ProductDetail product={product} />
        <Footer />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
