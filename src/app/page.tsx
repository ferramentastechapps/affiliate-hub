import { ProductGrid } from "@/components/ProductGrid";
import { CouponsSection } from "@/components/CouponsSection";
import { prisma } from "@/lib/prisma";

async function getCouponsByPlatform() {
  const coupons = await prisma.coupon.findMany({
    where: { isActive: true },
    select: { platform: true },
  });

  const platformCounts = coupons.reduce((acc, coupon) => {
    const platform = coupon.platform.toLowerCase();
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
    icon: "",
    color: "",
  }));
}

export default async function Home() {
  const couponsByPlatform = await getCouponsByPlatform();

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-hidden pt-20">
      <CouponsSection couponsByPlatform={couponsByPlatform} />

      <div className="w-full max-w-[1400px] mb-8 px-4 md:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white/90">
          Recomendações
        </h2>
        <p className="text-zinc-500 mt-2">Clique no produto para escolher a loja.</p>
      </div>

      <ProductGrid />
    </main>
  );
}
