import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const votes = await prisma.productVote.findMany({
      where: { productId: params.id }
    });

    const likes = votes.filter(v => v.type === 'LIKE').length;
    const dislikes = votes.filter(v => v.type === 'DISLIKE').length;

    return NextResponse.json({ likes, dislikes, votes });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json({ error: "Erro ao buscar avaliações" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { userId, type } = body; // type is 'LIKE' or 'DISLIKE' or 'REMOVE'

    if (!userId) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }

    if (type === 'REMOVE') {
      await prisma.productVote.deleteMany({
        where: { productId: params.id, userId }
      });
      return NextResponse.json({ success: true, message: "Voto removido" });
    }

    // Upsert the vote
    const vote = await prisma.productVote.upsert({
      where: {
        productId_userId: {
          productId: params.id,
          userId: userId
        }
      },
      update: { type },
      create: {
        productId: params.id,
        userId,
        type
      }
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json({ error: "Erro ao avaliar produto" }, { status: 500 });
  }
}
