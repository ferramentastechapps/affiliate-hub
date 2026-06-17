import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductDetail } from '@/components/ProductDetail';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { links: true }
    });

    if (!product) {
      return {
        title: 'Produto não encontrado | Economiza ai',
      };
    }

    return {
      title: `${product.name} | Economiza ai`,
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
      title: 'Produto não encontrado | Economiza ai',
    };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { links: true, coupons: true }
    });

    if (!product) {
      notFound();
    }

    return <ProductDetail product={product} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
