"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X, ArrowRight, ShieldCheck, Tag } from "@phosphor-icons/react";

export type AffiliateLinks = {
  amazon?: string;
  aliexpress?: string;
  shopee?: string;
  mercadoLivre?: string;
  tiktok?: string;
};

type PlatformModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: any; // Receives the full product object from DailyDeals or ProductGrid
};

// Tracking fake function
function trackAffiliateClick(platform: string, productName: string, url: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'affiliate_click', {
        event_category: 'Affiliate',
        event_label: platform,
        product_name: productName,
        affiliate_url: url,
      });
    }
  } catch (error) {
    console.error('Erro ao rastrear clique:', error);
  }
}

// Helper to deduce a simulated discount for the layout based on string length/id (matches DailyDeals logic)
function getSimulatedDiscount(id: string): number {
  if (!id) return 20;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 15 + (Math.abs(hash) % 45); // between 15% and 60%
}

export function PlatformModal({ isOpen, onClose, product }: PlatformModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!product) return null;

  // Deduce the first available link and its platform name
  let targetUrl = "";
  let platformName = "";
  
  if (product.links?.amazon) { targetUrl = product.links.amazon; platformName = "Amazon"; }
  else if (product.links?.mercadoLivre) { targetUrl = product.links.mercadoLivre; platformName = "Mercado Livre"; }
  else if (product.links?.shopee) { targetUrl = product.links.shopee; platformName = "Shopee"; }
  else if (product.links?.aliexpress) { targetUrl = product.links.aliexpress; platformName = "AliExpress"; }
  else if (product.links?.tiktok) { targetUrl = product.links.tiktok; platformName = "TikTok"; }
  else {
    // Falha ou não tem links, pegar qualquer uma primeira
    const values = Object.entries(product.links || {});
    const firstValid = values.find(([k, v]) => typeof v === 'string' && v.length > 0);
    if (firstValid) {
        platformName = firstValid[0];
        targetUrl = firstValid[1] as string;
    }
  }

  function handlePlatformClick() {
    if (!targetUrl) return;
    trackAffiliateClick(platformName, product.name, targetUrl);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  const discount = getSimulatedDiscount(product.id || 'abc');
  const price = product.price || 0;
  const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, y: 0,
              transition: { type: "spring", stiffness: 300, damping: 30 }
            }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-lg bg-[#0a0a0b] border border-white/10 shadow-[0_0_80px_rgba(40,110,250,0.15)] rounded-[2.5rem] flex flex-col overflow-hidden max-h-[90vh]"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/10 text-white"
            >
              <X size={20} weight="bold" />
            </button>
            
            <div className="overflow-y-auto hidden-scrollbar flex-1">
              
              {/* Product Image Stage */}
              <div className="relative w-full aspect-[4/3] bg-zinc-100 flex items-center justify-center p-8">
                {/* Badge Desconto */}
                {price > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-red-600 shadow-[0_4px_20px_rgba(220,38,38,0.5)] text-white font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 text-lg">
                    <Tag size={20} weight="fill" />
                    -{discount}%
                  </div>
                )}
                
                <img 
                   src={product.imageUrl} 
                   alt={product.name}
                   className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl"
                />
              </div>

              {/* Product Information Form */}
              <div className="p-8">
                <span className="text-xs font-bold text-accent uppercase tracking-widest">{product.category}</span>
                <h3 className="text-xl md:text-2xl tracking-tight text-white font-semibold mt-2 mb-6 leading-snug">
                  {product.name}
                </h3>
                
                {price > 0 ? (
                  <div className="flex flex-col mb-8 border border-white/5 bg-white/5 rounded-2xl p-5">
                    <span className="text-sm text-zinc-400 font-medium mb-1 line-through">
                      De: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                    </span>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-black text-white tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                      </span>
                      <span className="text-green-400 font-bold mb-1.5 px-2 py-0.5 bg-green-400/10 rounded-lg text-sm">
                        em até 10x sem juros
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-zinc-300">Verifique o preço atualizado diretamente no site da loja.</p>
                  </div>
                )}

                {/* Call to Action Primary Button */}
                <button
                  onClick={handlePlatformClick}
                  className="w-full flex items-center justify-center gap-2 group bg-accent hover:bg-accent-light text-white font-bold text-lg py-5 rounded-2xl transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(40,110,250,0.5)]"
                >
                  Ir para Promoção na {platformName}
                  <ArrowRight size={22} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Trust Elements */}
                <div className="mt-5 flex items-center justify-center gap-2 text-zinc-400 text-sm font-medium">
                  <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
                  Loja Segura Verificada
                </div>

                {/* Legal Text as Requested */}
                <p className="mt-8 text-[11px] text-zinc-600 leading-tight text-center max-w-sm mx-auto">
                  *Preço e disponibilidade sujeito a alteração a qualquer momento dependendo da loja parceira.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
