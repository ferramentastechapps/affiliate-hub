import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }

    const alert = await prisma.productAlert.upsert({
      where: {
        productId_userId: {
          productId: id,
          userId: userId
        }
      },
      update: {}, // Already exists, do nothing
      create: {
        productId: id,
        userId
      }
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json({ error: "Erro ao criar alerta" }, { status: 500 });
  }
}
