import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  if (validateApiKey(req)) return true;
  if (process.env.NODE_ENV !== 'production') return true;

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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const statusParam = searchParams.get('status'); // 'all', 'draft', 'queued', 'published'
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const isAdmin = await checkAdminAuth(req);
    const where: any = {};

    // Usuários públicos veem estritamente artigos publicados; rascunhos e fila apenas para admins
    if (isAdmin && statusParam === 'all') {
      // Retorna todos para o painel admin
    } else if (isAdmin && statusParam === 'draft') {
      where.status = 'draft';
    } else if (isAdmin && statusParam === 'queued') {
      where.status = 'queued';
    } else {
      where.status = 'published';
    }

    if (category && category !== 'todos') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const [posts, total, draftCount, queuedCount, publishedCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          author: true,
          readTimeMinutes: true,
          publishedAt: true,
          createdAt: true,
          status: true,
          views: true,
        },
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.count({ where: { status: 'draft' } }),
      prisma.blogPost.count({ where: { status: 'queued' } }),
      prisma.blogPost.count({ where: { status: 'published' } }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts: isAdmin
        ? {
            all: draftCount + queuedCount + publishedCount,
            draft: draftCount,
            queued: queuedCount,
            published: publishedCount,
          }
        : {
            all: publishedCount,
            draft: 0,
            queued: 0,
            published: publishedCount,
          },
    });
  } catch (error: any) {
    console.error('[API Blog GET] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar posts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const isAuth = await checkAdminAuth(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, coverImage, status, title, excerpt } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (coverImage !== undefined) {
      dataToUpdate.coverImage = coverImage ? coverImage.trim() : null;
    }
    if (title !== undefined && title.trim()) {
      dataToUpdate.title = title.trim();
    }
    if (excerpt !== undefined) {
      dataToUpdate.excerpt = excerpt.trim();
    }
    if (status !== undefined) {
      dataToUpdate.status = status;
      if (status === 'published') {
        dataToUpdate.publishedAt = new Date();
      }
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: dataToUpdate,
    });

    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${updated.slug}`);
      revalidatePath('/sitemap.xml');
      revalidatePath('/blog/rss.xml');
    } catch (e) {
      console.warn('[API Blog PATCH] Falha ao revalidar caminhos:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Post atualizado com sucesso',
      post: updated,
    });
  } catch (error: any) {
    console.error('[API Blog PATCH] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar post' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await checkAdminAuth(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório' }, { status: 400 });
    }

    const deleted = await prisma.blogPost.delete({
      where: { id },
    });

    try {
      revalidatePath('/blog');
      revalidatePath(`/blog/${deleted.slug}`);
      revalidatePath('/sitemap.xml');
    } catch (e) {
      console.warn('[API Blog DELETE] Falha ao revalidar caminhos:', e);
    }

    return NextResponse.json({ success: true, message: 'Post excluído com sucesso' });
  } catch (error: any) {
    console.error('[API Blog DELETE] Erro:', error);
    return NextResponse.json({ error: 'Erro ao excluir post' }, { status: 500 });
  }
}
