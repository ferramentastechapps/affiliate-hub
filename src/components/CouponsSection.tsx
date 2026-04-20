"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Copy, Check } from "@phosphor-icons/react";
import { useState, useEffect } from "react";

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
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  useEffect(() => {
    if (selectedPlatform) {
      setLoading(true);
      fetch('/api/coupons')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                // Filtra apenas da loja clicada
                const normalize = (p: string) => {
                  const l = p.toLowerCase();
                  if (l === 'mercado livre' || l === 'mercadolivre') return 'mercadolivre';
                  if (l === 'magalu' || l === 'magazine') return 'magazineluiza';
                  if (l === 'boticario') return 'oboticario';
                  return l;
                };
                
                const sel = normalize(selectedPlatform);
                const filtered = data.filter((c: any) => normalize(c.platform) === sel);
                
                // Remove cupons duplicados (mesmo código)
                const uniqueCoupons = [];
                const seenCodes = new Set();
                for (const c of filtered) {
                  const upperCode = c.code.toUpperCase();
                  if (!seenCodes.has(upperCode)) {
                    seenCodes.add(upperCode);
                    uniqueCoupons.push(c);
                  }
                }
                
                setCouponsList(uniqueCoupons);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [selectedPlatform]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!couponsByPlatform || couponsByPlatform.length === 0) return null;

  // Organiza: Mercado Livre, Shopee, Amazon -> depois os mais volumosos
  const sortedCoupons = [...couponsByPlatform].sort((a, b) => {
    const getPriority = (p: string) => {
      const lower = p.toLowerCase();
      if (lower === 'mercadolivre' || lower === 'mercado livre') return 1;
      if (lower === 'shopee') return 2;
      if (lower === 'amazon') return 3;
      return 99;
    };
    
    const pA = getPriority(a.platform);
    const pB = getPriority(b.platform);
    
    if (pA !== pB) return pA - pB;
    return b.count - a.count;
  });

  const limit = 8;
  const displayCoupons = showAllCoupons ? sortedCoupons : sortedCoupons.slice(0, limit);

  return (
    <>
      <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-blue-500/20">
              <Tag size={24} weight="fill" className="text-accent" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Cupons Rápidos
              </h2>
            </div>
          </div>
          {sortedCoupons.length > limit && (
            <button 
              onClick={() => setShowAllCoupons(!showAllCoupons)}
              className="flex text-sm font-medium text-accent hover:text-white transition-colors items-center gap-1 bg-accent/10 md:px-4 px-3 py-2 rounded-full hover:bg-accent/20"
            >
              <span className="hidden sm:inline">{showAllCoupons ? "Esconder" : "Ver todos"}</span>
              <span className="sm:hidden">{showAllCoupons ? "Menos" : "Mais"}</span>
              <div className={showAllCoupons ? "rotate-180 transition-transform" : "transition-transform"}>
                 <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.66663 11.3333L11.3333 4.66663" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.66663 4.66663H11.3333V11.3333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
              </div>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayCoupons.map((item, index) => {
            const domain = getDomainFromPlatform(item.platform);
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

            return (
              <motion.button
                key={item.platform}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: "spring", stiffness: 100 }}
                onClick={() => setSelectedPlatform(item.platform)}
                className="relative group w-full text-left focus:outline-none"
              >
                <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 flex items-center justify-between gap-2 border border-white/10 hover:border-accent/40 hover:shadow-lg hover:-translate-y-1">
                  
                  <div className="flex items-center gap-3 min-w-0">
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

                  {item.count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-accent w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(40,110,250,0.8)]" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Modal Modal Modal Modal Modal */}
      <AnimatePresence>
        {selectedPlatform && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen"
            onClick={() => setSelectedPlatform(null)}
          >
            {/* Overlay Glass */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-zinc-900 border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1.5 shadow-inner">
                    <img src={`https://www.google.com/s2/favicons?domain=${getDomainFromPlatform(selectedPlatform)}&sz=64`} alt="logo" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white capitalize">{selectedPlatform}</h3>
                    <p className="text-zinc-400 text-sm">Cupons Exclusivos</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlatform(null)} className="p-3 bg-black/20 rounded-full hover:bg-white/10 text-white transition-colors">
                  <X size={20} weight="bold" />
                </button>
              </div>
              
              {/* Content / Scrollable */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <span className="text-zinc-400 text-sm font-medium">Buscando as melhores ofertas...</span>
                  </div>
                ) : couponsList.length > 0 ? (
                  couponsList.map(coupon => (
                    <div key={coupon.id} className="relative bg-[#111] border border-white/5 rounded-[1.5rem] p-5 flex flex-col gap-4 group hover:border-accent/30 transition-colors">
                      {/* Pontilhado lateral de ingresso */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-r border-white/5" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-l border-white/5" />

                      <div className="pl-4 pr-1">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            <h4 className="font-bold text-lg text-white leading-tight">{coupon.discount} OFF</h4>
                            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{coupon.description}</p>
                          </div>
                        </div>
                        
                        <div className="mt-5 flex items-center bg-black rounded-xl p-1 border border-white/5">
                          <div className="flex-1 text-center font-mono font-bold tracking-widest text-zinc-300 pt-[2px]">
                            {coupon.code}
                          </div>
                          <button 
                            onClick={() => copyToClipboard(coupon.code)}
                            className={`px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${
                              copied === coupon.code 
                                ? "bg-emerald-500 text-white" 
                                : "bg-white text-black hover:bg-zinc-200"
                            }`}
                          >
                            {copied === coupon.code ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
                            {copied === coupon.code ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Tag size={48} className="text-zinc-600 mb-2" weight="duotone" />
                    <h3 className="text-lg font-bold text-white">Poxa, nenhum cupom!</h3>
                    <p className="text-zinc-400 text-sm max-w-[200px]">Os cupons desta loja esgotaram ou expiraram recentemente.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
