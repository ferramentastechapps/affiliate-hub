import { prisma } from "@/lib/prisma";

export async function getHomeInitialProducts(limit = 24) {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: { in: ["active", "approved"] },
      },
      take: limit,
      include: {
        links: true,
        productLinks: true,
        images: true,
        coupons: {
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        },
        votes: {
          select: { type: true, userId: true },
        },
        priceHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = products.map((p) => {
      const likes = p.votes?.filter((v: any) => v.type === "LIKE").length || 0;
      const dislikes = p.votes?.filter((v: any) => v.type === "DISLIKE").length || 0;
      return {
        ...p,
        _count: {
          ...p._count,
          likes,
          dislikes,
        },
      };
    });

    return JSON.parse(JSON.stringify(mapped));
  } catch (error) {
    console.error("Erro ao buscar produtos iniciais SSR:", error);
    return [];
  }
}

export async function getHomeTrendingProducts(limit = 10) {
  try {
    let products = await prisma.product.findMany({
      where: {
        status: { in: ["active", "approved"] },
        clicks: { gt: 0 },
      },
      include: {
        links: true,
        coupons: true,
        productLinks: { where: { isActive: true } },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
      orderBy: [
        { clicks: "desc" },
        { updatedAt: "desc" },
      ],
      take: limit,
    });

    if (products.length < 4) {
      const existingIds = products.map((p) => p.id);
      const fallback = await prisma.product.findMany({
        where: {
          status: { in: ["active", "approved"] },
          id: { notIn: existingIds },
        },
        include: {
          links: true,
          coupons: true,
          productLinks: { where: { isActive: true } },
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit - products.length,
      });
      products = [...products, ...fallback];
    }

    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    console.error("Erro ao buscar produtos em alta SSR:", error);
    return [];
  }
}
