import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function checkAdminOrApiAuth(req: NextRequest): Promise<boolean> {
  if (validateApiKey(req)) return true;
  if (process.env.NODE_ENV !== 'production') return true;

  const cronSecret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) return true;

  const clientIp = req.headers.get('x-forwarded-for') || '';
  const isLocalhost =
    clientIp.includes('127.0.0.1') ||
    clientIp.includes('::1') ||
    req.headers.get('host')?.includes('localhost');
  if (isLocalhost) return true;

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (sessionToken) {
      const payload = verifyToken(sessionToken);
      if (payload && ['admin', 'moderator'].includes(payload.role)) return true;
    }
    const adminSession = cookieStore.get('admin_session')?.value;
    if (adminSession === 'authenticated') return true;
  } catch {}

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const [queuedPosts, queuedCount, draftCount, publishedCount] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          coverImage: true,
          createdAt: true,
        },
      }),
      prisma.blogPost.count({ where: { status: 'queued' } }),
      prisma.blogPost.count({ where: { status: 'draft' } }),
      prisma.blogPost.count({ where: { status: 'published' } }),
    ]);

    return NextResponse.json({
      success: true,
      queuedCount,
      draftCount,
      publishedCount,
      nextInQueue: queuedPosts[0] || null,
      queue: queuedPosts,
    });
  } catch (error: any) {
    console.error('[API Blog Queue GET] Erro:', error);
    return NextResponse.json({ error: 'Erro ao consultar fila' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await checkAdminOrApiAuth(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    // Transação atômica com bloqueio otimista contra concorrência
    const publishedPost = await prisma.$transaction(async (tx) => {
      let candidate = null;

      if (id) {
        candidate = await tx.blogPost.findUnique({
          where: { id },
        });
      } else {
        candidate = await tx.blogPost.findFirst({
          where: { status: 'queued' },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (!candidate) return null;

      // Lock otimista: garante que apenas um processo altera o status
      const updated = await tx.blogPost.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
        },
        data: {
          status: 'published',
          publishedAt: candidate.status === 'published' && candidate.publishedAt ? candidate.publishedAt : new Date(),
        },
      });

      if (updated.count === 0) {
        return null; // Outro processo publicou concorrentemente
      }

      return await tx.blogPost.findUnique({
        where: { id: candidate.id },
      });
    });

    if (!publishedPost) {
      const remainingQueued = await prisma.blogPost.count({ where: { status: 'queued' } });
      const draftCount = await prisma.blogPost.count({ where: { status: 'draft' } });
      return NextResponse.json({
        success: true,
        published: false,
        message: 'Nenhum post na fila para publicação automática.',
        remainingQueued,
        draftCount,
      });
    }

    const remainingQueued = await prisma.blogPost.count({ where: { status: 'queued' } });

    // Revalidação de cache ISR / Rotas públicas
    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${publishedPost.slug}`);
      revalidatePath('/sitemap.xml');
      revalidatePath('/blog/rss.xml');
    } catch (revalErr) {
      console.warn('[API Blog Queue Publish] Aviso ao revalidar caminhos:', revalErr);
    }

    console.log(`[API Blog Queue] Post publicado com sucesso: "${publishedPost.title}" (${publishedPost.slug})`);

    return NextResponse.json({
      success: true,
      published: true,
      message: `Artigo "${publishedPost.title}" publicado com sucesso!`,
      post: {
        id: publishedPost.id,
        slug: publishedPost.slug,
        title: publishedPost.title,
        category: publishedPost.category,
        publishedAt: publishedPost.publishedAt,
      },
      remainingQueued,
    });
  } catch (error: any) {
    console.error('[API Blog Queue Publish POST] Erro:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao publicar post da fila' },
      { status: 500 }
    );
  }
}
