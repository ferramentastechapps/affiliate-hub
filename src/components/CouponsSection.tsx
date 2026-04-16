"use client";

import { motion } from "framer-motion";
import { Tag } from "@phosphor-icons/react";
import { useState } from "react";

type CouponsByPlatform = {
  platform: string;
  count: number;
};

type CouponsSectionProps = {
  couponsByPlatform: CouponsByPlatform[];
};

function getDomainFromPlatform(platform: string): string {
  const p = platform.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  if (p === 'amazon') return 'amazon.com.br';
  if (p === 'mercadolivre') return 'mercadolivre.com.br';
  if (p === 'oboticario' || p === 'boticario') return 'boticario.com.br';
  if (p === 'deonibus') return 'deonibus.com';
  if (p === 'lg') return 'lg.com';
  if (p === 'shopee') return 'shopee.com.br';
  if (p === 'aliexpress') return 'aliexpress.com';
  if (p === 'fastshop') return 'fastshop.com.br';
  if (p === 'nike') return 'nike.com.br';
  if (p === 'adidas') return 'adidas.com.br';
  if (p === 'netshoes') return 'netshoes.com.br';
  if (p === 'zattini') return 'zattini.com.br';
  if (p === 'magazine' || p === 'magazineluiza' || p === 'magalu') return 'magazineluiza.com.br';
  return p + '.com.br';
}

export function CouponsSection({ couponsByPlatform }: CouponsSectionProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  if (!couponsByPlatform || couponsByPlatform.length === 0) return null;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-blue-500/20">
          <Tag size={24} weight="fill" className="text-accent" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Cupons Rápidos
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {couponsByPlatform.map((item, index) => {
          const domain = getDomainFromPlatform(item.platform);
          // O Google Favicon reune imagens perfeitas de favicons corporativos ao redor da web.
          const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

          return (
            <motion.button
              key={item.platform}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedPlatform(item.platform)}
              className="relative group w-full text-left"
            >
              <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 flex items-center justify-between gap-2 border border-white/10 hover:border-accent/40 hover:shadow-lg hover:-translate-y-1">
                
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm p-1">
                    <img 
                      src={iconUrl} 
                      alt={item.platform} 
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate capitalize">
                    {item.platform}
                  </h3>
                </div>

                <div className="bg-accent/20 px-2.5 py-1 rounded-full shrink-0 flex items-center">
                  <span className="text-[11px] font-bold text-accent leading-none mt-[1px]">
                    {item.count}
                  </span>
                </div>

                {/* Badge de sinalização mínima */}
                {item.count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-accent w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(40,110,250,0.8)]" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
