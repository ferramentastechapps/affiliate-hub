import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { generateDailyBlogPost } from '@/lib/blog-generator';
import { validateApiKey } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = validateApiKey(req);
    const isDev = process.env.NODE_ENV !== 'production';
    const cronSecret = req.headers.get('x-cron-secret');
    const isCronAuthorized = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

    // Permite chamadas locais do bot ou com chaves autorizadas
    const clientIp = req.headers.get('x-forwarded-for') || '';
    const isLocalhost = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || req.headers.get('host')?.includes('localhost');

    if (!isAuthorized && !isDev && !isCronAuthorized && !isLocalhost) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate-limit: Evita loops acidentais se não tiver o parâmetro force=true
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    if (!force) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentPost = await prisma.blogPost.findFirst({
        where: { createdAt: { gte: tenMinutesAgo } },
        select: { id: true, title: true, createdAt: true },
      });

      if (recentPost) {
        return NextResponse.json(
          {
            error: 'Um artigo foi gerado recentemente. Para evitar custos desnecessários de IA, aguarde 10 minutos.',
            recentPostTitle: recentPost.title,
          },
          { status: 429 }
        );
      }
    }

    console.log('[API Blog] Iniciando geração automática de post...');
    const body = await req.json().catch(() => ({}));
    const { topicType, forceTopic } = body;

    const post = await generateDailyBlogPost({
      topicType: topicType || 'auto',
      forceTopic,
    });

    // Revalida páginas estáticas no Next.js
    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${post.slug}`);
      revalidatePath('/sitemap.xml');
    } catch (revalidateErr) {
      console.warn('[API Blog] Aviso ao revalidar caminhos:', revalidateErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Post de blog gerado e salvo como rascunho (aguardando aprovação)!',
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        category: post.category,
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[API Blog] Erro ao gerar post:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar post do blog' },
      { status: 500 }
    );
  }
}
