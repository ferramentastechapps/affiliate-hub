import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Obter parâmetro opcional de limite de dias (default 30)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    
    if (isNaN(days) || days <= 0) {
      return NextResponse.json({ error: "Parâmetro 'days' inválido" }, { status: 400 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar histórico de preços
    const history = await prisma.priceHistory.findMany({
      where: {
        productId: id,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Agrupar por dia (pegar o último registro de cada dia)
    const grouped: Record<string, { date: string; price: number; originalPrice: number | null }> = {};

    for (const record of history) {
      // Obter data em formato YYYY-MM-DD baseado no UTC/Server date
      const dateStr = record.createdAt.toISOString().split("T")[0];
      
      // Sobrescreve para garantir que o último registro do dia seja selecionado
      grouped[dateStr] = {
        date: dateStr,
        price: record.price,
        originalPrice: record.originalPrice,
      };
    }

    const result = Object.values(grouped);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao buscar histórico de preços:", error);
    return NextResponse.json({ error: "Erro interno ao processar histórico" }, { status: 500 });
  }
}
