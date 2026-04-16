"use client";

import { motion } from "framer-motion";
import { Tag } from "@phosphor-icons/react";
import { useState } from "react";

type CouponsByPlatform = {
  platform: string;
  count: number;
  icon: string;
  color: string;
};

type CouponsSectionProps = {
  couponsByPlatform: CouponsByPlatform[];
};

const platformIcons: Record<string, { icon: string; color: string; name: string }> = {
  amazon: { icon: "🛒", color: "from-orange-500 to-yellow-500", name: "Amazon" },
  mercadolivre: { icon: "💛", color: "from-yellow-400 to-yellow-600", name: "Mercado Livre" },
  shopee: { icon: "🛍️", color: "from-orange-600 to-red-600", name: "Shopee" },
  aliexpress: { icon: "🎁", color: "from-red-500 to-red-700", name: "AliExpress" },
  tiktok: { icon: "🎵", color: "from-pink-500 to-purple-600", name: "TikTok" },
};

export function CouponsSection({ couponsByPlatform }: CouponsSectionProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-blue-500/20">
          <Tag size={24} weight="fill" className="text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Cupons das Melhores Lojas
          </h2>
          <p className="text-sm text-zinc-400">
            Economize ainda mais com nossos cupons exclusivos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {couponsByPlatform.map((item, index) => {
          const platformInfo = platformIcons[item.platform.toLowerCase()] || {
            icon: "🏪",
            color: "from-gray-500 to-gray-700",
            name: item.platform,
          };

          return (
            <motion.button
              key={item.platform}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedPlatform(item.platform)}
              className="relative group"
            >
              <div className="glass-panel p-6 rounded-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3">
                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${platformInfo.color} flex items-center justify-center text-3xl shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  {platformInfo.icon}
                </div>

                {/* Platform Name */}
                <h3 className="text-sm font-semibold text-white text-center">
                  {platformInfo.name}
                </h3>

                {/* Coupon Count */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-accent">
                    {item.count}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {item.count === 1 ? "cupom" : "cupons"}
                  </span>
                </div>

                {/* Badge */}
                {item.count > 0 && (
                  <div className="absolute -top-2 -right-2 bg-accent text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    Novo
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
