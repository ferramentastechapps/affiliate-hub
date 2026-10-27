import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🗺️ SITEMAP DINÂMICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gera sitemap.xml automaticamente com todas as páginas do site

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://economizei.ftech-apps.com.br';

  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cupons`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    // Buscar produtos ativos (para URLs dos produtos, e também inferir categorias/lojas)
    const products = await prisma.product.findMany({
      where: { status: { in: ['active', 'approved'] } },
      select: {
        shortId: true,
        updatedAt: true,
        category: true,
        storeName: true,
        platformType: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/produto/${product.shortId}`,
      lastModified: product.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // Extrair categorias exclusivas
    const categoriesSet = new Set<string>();
    const storesSet = new Set<string>();

    products.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
      if (p.storeName) storesSet.add(p.storeName);
      if (p.platformType) storesSet.add(p.platformType);
    });

    const categoryPages: MetadataRoute.Sitemap = Array.from(categoriesSet).map((cat) => ({
      url: `${baseUrl}/categoria/${slugify(cat)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    const storePages: MetadataRoute.Sitemap = Array.from(storesSet).map((store) => ({
      url: `${baseUrl}/loja/${slugify(store)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    // Buscar posts de blog publicados para o sitemap
    const blogPosts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }));

    return [...staticPages, ...productPages, ...categoryPages, ...storePages, ...blogPages];
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    return staticPages;
  }
}
