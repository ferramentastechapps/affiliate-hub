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
    // Buscar pelo shortId (número) ou id (string)
    const isNumeric = /^\d+$/.test(id);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(id) } : { id },
      include: { links: true }
    });

    if (!product) {
      return {
        title: 'Produto não encontrado | Economizei',
      };
    }

    return {
      title: `${product.name} | Economizei`,
      description: product.description || `Compre ${product.name} com o melhor preço. Aproveite cupons de desconto exclusivos!`,
      openGraph: {
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [{ url: product.imageUrl }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: product.description || `Compre ${product.name} com o melhor preço`,
        images: [product.imageUrl],
      },
    };
  } catch (error) {
    return {
      title: 'Produto não encontrado | Economizei',
    };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  try {
    // Buscar pelo shortId (número) ou id (string)
    const isNumeric = /^\d+$/.test(id);
    const product = await prisma.product.findUnique({
      where: isNumeric ? { shortId: parseInt(id) } : { id },
      include: { links: true, coupons: true }
    });

    if (!product) {
      notFound();
    }

    return (
      <>
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
