import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.comment.findMany({
      where: { productId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Erro ao buscar comentários" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { text, userId, guestName } = body;

    if (!text) {
      return NextResponse.json({ error: "O comentário não pode ser vazio" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        productId: params.id,
        userId: userId || null,
        guestName: guestName || null
      },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Erro ao postar comentário" }, { status: 500 });
  }
}
