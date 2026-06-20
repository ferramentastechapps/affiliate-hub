"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, CaretLeft, Copy, Check } from "@phosphor-icons/react";

type Coupon = {
  id: string;
  code: string;
  description: string;
  discount: string;
  platform: string;
};

type CouponsByPlatform = {
  platform: string;
  count: number;
  coupons: Coupon[];
};

function getDomainFromPlatform(platform: string): string {
  const p = platform.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  if (p === 'amazon') return 'amazon.com.br';
  if (p === 'mercadolivre') return 'mercadolivre.com.br';
  if (p === 'oboticario' || p === 'boticario') return 'boticario.com.br';
  if (p === 'deonibus') return 'deonibus.com';
  if (p === 'lg') return 'lg.com';
  if (p === 'shopee') return 'shopee.com.br';
  if (p === 'aliexpress' || p === 'ali') return 'aliexpress.com';
  if (p === 'tiktok' || p === 'tiktokshop') return 'tiktok.com';
  if (p === 'kabum') return 'kabum.com.br';
  if (p === 'fastshop') return 'fastshop.com.br';
  if (p === 'nike') return 'nike.com.br';
  if (p === 'adidas') return 'adidas.com.br';
  if (p === 'netshoes') return 'netshoes.com.br';
  if (p === 'zattini') return 'zattini.com.br';
  if (p === 'magazine' || p === 'magazineluiza' || p === 'magalu') return 'magazineluiza.com.br';
  return p + '.com.br';
}

export function CouponsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [groupedCoupons, setGroupedCoupons] = useState<CouponsByPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Sync hash and custom events to open the modal
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#cupons") {
        setIsOpen(true);
      }
    };

    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-coupons", handleOpen);
    window.addEventListener("hashchange", checkHash);

    checkHash();

    return () => {
      window.removeEventListener("open-coupons", handleOpen);
      window.removeEventListener("hashchange", checkHash);
    };
  }, []);

  // Control body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchCoupons(); // Load data when opened
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const fetchCoupons = () => {
    setLoading(true);
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((data: Coupon[]) => {
        if (!Array.isArray(data)) return;

        // Group coupons by platform and remove duplicates by code
        const byPlatform: Record<string, { count: number; coupons: Coupon[] }> = {};
        
        for (const c of data) {
          let p = c.platform.toLowerCase().trim();
          if (p.includes('mercado') || p === 'meli') p = 'Mercado Livre';
          else if (p.includes('magalu') || p.includes('magazine')) p = 'Magalu';
          else if (p.includes('boticario')) p = 'O Boticário';
          else if (p.includes('shopee')) p = 'Shopee';
          else if (p.includes('amazon')) p = 'Amazon';
          else if (p.includes('aliexpress') || p === 'ali') p = 'AliExpress';
          else if (p.includes('tiktok')) p = 'TikTok Shop';
          else if (p.includes('kabum')) p = 'KaBuM!';
          else p = c.platform;

          if (!byPlatform[p]) {
            byPlatform[p] = { count: 0, coupons: [] };
          }
          
          const upperCode = c.code.toUpperCase();
          if (!byPlatform[p].coupons.find(existing => existing.code.toUpperCase() === upperCode)) {
            byPlatform[p].coupons.push(c);
            byPlatform[p].count++;
          }
        }

        const formatted = Object.entries(byPlatform)
          .map(([platform, data]) => ({
            platform,
            count: data.count,
            coupons: data.coupons
          }))
          .sort((a, b) => b.count - a.count);

        setGroupedCoupons(formatted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleClose = () => {
    setIsOpen(false);
    setActivePlatform(null);
    if (window.location.hash === "#cupons") {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const activePlatformData = groupedCoupons.find((c) => c.platform === activePlatform);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 min-h-screen"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal Body */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: { type: "spring", stiffness: 300, damping: 30 },
            }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-4xl glass-3d-card rounded-[2.5rem] flex flex-col overflow-hidden max-h-[85vh] mx-2 sm:mx-0 z-10"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Fechar modal"
              className="absolute top-4 right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/10 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} weight="bold" />
            </button>

            <div className="overflow-y-auto hidden-scrollbar flex-1 p-6 sm:p-8 pb-10">
              <AnimatePresence mode="wait">
                {!activePlatform ? (
                  <motion.div
                    key="platforms-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-orange-500/20">
                        <Tag size={24} weight="fill" className="text-accent" />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-1">
                          Cupons de Desconto
                        </h2>
                        <p className="text-zinc-400 text-sm">
                          Escolha uma loja para ver os cupons disponíveis
                        </p>
                      </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                        <span className="text-zinc-400 text-sm font-medium">Buscando lojas com cupons...</span>
                      </div>
                    )}

                    {/* Platforms Grid Selector */}
                    {!loading && groupedCoupons.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {groupedCoupons.map((item) => {
                          const domain = getDomainFromPlatform(item.platform);
                          const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

                          return (
                            <button
                              key={item.platform}
                              onClick={() => setActivePlatform(item.platform)}
                              className="relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-[20px] transition-all duration-300 text-center border bg-black/20 border-white/10 hover:bg-white/10 hover:border-accent/40 group overflow-visible"
                            >
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-sm p-1.5 transition-transform group-hover:scale-110">
                                <img 
                                  src={iconUrl} 
                                  alt={item.platform} 
                                  className="w-full h-full object-contain mix-blend-multiply"
                                  loading="lazy"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </div>
                              <span className="text-xs sm:text-sm font-bold leading-tight text-zinc-300 group-hover:text-white transition-colors capitalize">
                                {item.platform}
                              </span>
                              
                              <div className="absolute -top-2 -right-2 bg-accent px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,107,53,0.8)] border border-white/20">
                                <span className="text-[10px] font-bold text-white">
                                  {item.count}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!loading && groupedCoupons.length === 0 && (
                      <div className="text-center py-12 text-zinc-500 border border-dashed border-white/5 rounded-2xl">
                        <Tag size={48} className="text-zinc-600 mb-2 mx-auto" weight="duotone" />
                        <h3 className="text-lg font-bold text-white mb-1">Nenhum cupom no momento</h3>
                        <p className="text-sm">Volte mais tarde para novas ofertas!</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="coupons-list-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full"
                  >
                    {/* Back Button & Header */}
                    <div className="flex items-center gap-4 mb-8">
                      <button
                        onClick={() => setActivePlatform(null)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white border border-white/5 flex-shrink-0"
                      >
                        <CaretLeft size={20} weight="bold" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-inner shrink-0 hidden sm:flex">
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${getDomainFromPlatform(activePlatform)}&sz=64`} 
                            alt="logo" 
                            className="w-full h-full object-contain mix-blend-multiply" 
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1 capitalize truncate">
                            {activePlatform}
                          </h3>
                          <p className="text-zinc-400 text-xs sm:text-sm">
                            {activePlatformData?.count || 0} cupons disponíveis
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Coupons List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activePlatformData?.coupons.map(coupon => (
                        <div key={coupon.id} className="relative bg-[#111] border border-white/5 rounded-[1.5rem] p-4 sm:p-5 flex flex-col gap-4 group hover:border-accent/30 transition-colors">
                          {/* Pontilhado lateral de ingresso */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-r border-white/5 hidden sm:block" />
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-l border-white/5 hidden sm:block" />

                          <div className="sm:px-4">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <div>
                                <h4 className="font-bold text-base sm:text-lg text-white leading-tight">{coupon.discount}</h4>
                                <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">{coupon.description}</p>
                              </div>
                            </div>
                            
                            <div className="mt-5 flex items-center bg-black rounded-xl p-1 border border-white/5">
                              <div className="flex-1 text-center font-mono font-bold tracking-widest text-zinc-300 pt-[2px] text-sm sm:text-base break-all px-2">
                                {coupon.code}
                              </div>
                              <button 
                                onClick={() => copyToClipboard(coupon.code)}
                                className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all text-sm min-h-[44px] shrink-0 ${
                                  copied === coupon.code 
                                    ? "bg-emerald-500 text-white" 
                                    : "bg-white text-black hover:bg-zinc-200"
                                }`}
                              >
                                {copied === coupon.code ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
                                <span className="hidden sm:inline">{copied === coupon.code ? "Copiado!" : "Copiar"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
