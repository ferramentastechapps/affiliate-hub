import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    const banners = await prisma.banner.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error('❌ Erro ao buscar banners:', error);
    return NextResponse.json({ error: 'Erro ao buscar banners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, imageDesktop, imageMobile, link, order } = body;

    if (!title || !imageDesktop || !imageMobile) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, imageDesktop, imageMobile' },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        imageDesktop,
        imageMobile,
        link: link || null,
        order: order ?? 0,
      },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar banner:', error);
    return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 });
  }
}
