import { prisma } from '@/lib/prisma';

/**
 * Recalcula o engagementScore de um usuário com base em sua atividade.
 *
 * Fórmula:
 * +1 por clique (máx 30 pts de cliques)
 * +5 por comentário
 * +3 por voto
 * +2 por alerta criado
 * +10 bônus se teve atividade nos últimos 7 dias
 * +5 bônus se tem >3 categorias distintas clicadas
 */
export async function recalculateEngagementScore(userId: string): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    commentCount,
    voteCount,
    alertCount,
    recentComments,
    recentVotes,
    recentAlerts,
    clickedCategories,
  ] = await Promise.all([
    prisma.comment.count({ where: { userId } }),
    prisma.productVote.count({ where: { userId } }),
    prisma.productAlert.count({ where: { userId } }),
    prisma.comment.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.productVote.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.productAlert.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
    // Categorias distintas de produtos clicados (via comments/votes como proxy)
    prisma.comment.findMany({
      where: { userId },
      select: { product: { select: { category: true } } },
      distinct: ['productId'],
    }),
  ]);

  // Cliques: não temos userId em ClickLog, então usamos o número de produtos
  // comentados/votados como proxy de engajamento de navegação
  const uniqueProductsInteracted = await prisma.comment
    .findMany({
      where: { userId },
      select: { productId: true },
      distinct: ['productId'],
    })
    .then((r) => r.length);

  const clickPoints = Math.min(uniqueProductsInteracted, 30);
  const commentPoints = commentCount * 5;
  const votePoints = voteCount * 3;
  const alertPoints = alertCount * 2;

  const hadRecentActivity = recentComments > 0 || recentVotes > 0 || recentAlerts > 0;
  const recentBonus = hadRecentActivity ? 10 : 0;

  const distinctCategories = new Set(
    clickedCategories.map((c) => c.product?.category).filter(Boolean)
  ).size;
  const categoryBonus = distinctCategories > 3 ? 5 : 0;

  const score = Math.min(
    100,
    clickPoints + commentPoints + votePoints + alertPoints + recentBonus + categoryBonus
  );

  await prisma.user.update({
    where: { id: userId },
    data: { engagementScore: score },
  });

  return score;
}
