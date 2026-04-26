import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { title, imageDesktop, imageMobile, link, order, isActive } = body;

    const banner = await prisma.banner.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(imageDesktop !== undefined && { imageDesktop }),
        ...(imageMobile !== undefined && { imageMobile }),
        ...(link !== undefined && { link: link || null }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('❌ Erro ao atualizar banner:', error);
    return NextResponse.json({ error: 'Erro ao atualizar banner' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.banner.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao deletar banner:', error);
    return NextResponse.json({ error: 'Erro ao deletar banner' }, { status: 500 });
  }
}
