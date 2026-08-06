import { NextRequest, NextResponse } from "next/server";
import { detectSmartCategory } from "@/lib/category-detector";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, description = "", category: rawCategory = "", url = "" } = body;

    if (!productName) {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 });
    }

    // Detecta a categoria usando o motor inteligente aprimorado
    const detectedCategory = detectSmartCategory(productName, `${description} ${url}`, rawCategory);

    return NextResponse.json({ 
      category: detectedCategory,
      confidence: detectedCategory === "Diversos" ? "low" : "high"
    });
  } catch (error) {
    console.error("Erro ao detectar categoria:", error);
    return NextResponse.json({ error: "Erro interno ao detectar categoria" }, { status: 500 });
  }
}
