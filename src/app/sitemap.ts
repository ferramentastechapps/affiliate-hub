import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🗺️ SITEMAP DINÂMICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gera sitemap.xml automaticamente com todas as páginas do site
// Ajuda os motores de busca a indexar o site corretamente

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // URL base do site (ALTERE PARA SEU DOMÍNIO)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-dominio.com';

  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  try {
    // Buscar produtos para gerar URLs dinâmicas (se você tiver páginas de produto individuais)
    const products = await prisma.product.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Gerar URLs de produtos (descomente se você tiver páginas /produto/[id])
    // const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    //   url: `${baseUrl}/produto/${product.id}`,
    //   lastModified: product.updatedAt,
    //   changeFrequency: 'weekly' as const,
    //   priority: 0.8,
    // }));

    // return [...staticPages, ...productPages];
    return staticPages;
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    // Retornar apenas páginas estáticas em caso de erro
    return staticPages;
  }
}
