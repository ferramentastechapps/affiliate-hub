import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-utils";
import { createRateLimiter, getClientIp, sanitizeInput } from "@/lib/rate-limit";

const prisma = new PrismaClient();

// Rate limit: 5 comentários por minuto por IP
const commentsRateLimiter = createRateLimiter('comments-post', {
  windowMs: 60 * 1000,
  max: 5,
  message: 'Muitos comentários. Aguarde 1 minuto.',
});

const MAX_COMMENT_LENGTH = 1000;
const MAX_GUEST_NAME_LENGTH = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = await prisma.comment.findMany({
      where: { productId: id },
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // --- Rate limiting ---
    const ip = getClientIp(request);
    const rl = commentsRateLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.message },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { guestName: rawGuestName } = body;
    const rawText = body.text;

    // --- Validação e sanitização ---
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: "O comentário não pode ser vazio" }, { status: 400 });
    }

    const text = sanitizeInput(rawText, MAX_COMMENT_LENGTH);
    if (text.length === 0) {
      return NextResponse.json({ error: "Comentário inválido" }, { status: 400 });
    }

    // --- UserId vem da sessão (nunca do body — evita impersonation) ---
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionPayload = sessionToken ? verifyToken(sessionToken) : null;
    const userId = sessionPayload?.userId || null;

    // Nome de convidado: apenas se não estiver autenticado
    const guestName = (!userId && rawGuestName)
      ? sanitizeInput(String(rawGuestName), MAX_GUEST_NAME_LENGTH)
      : null;

    const comment = await prisma.comment.create({
      data: {
        text,
        productId: id,
        userId,
        guestName,
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
