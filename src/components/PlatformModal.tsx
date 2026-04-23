"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, ArrowRight, ShieldCheck, Tag } from "@phosphor-icons/react";
import { CouponModal } from "./CouponModal";

export type ProductLinks = {
  amazon?: string;
  aliexpress?: string;
  shopee?: string;
  mercadoLivre?: string;
  tiktok?: string;
  netshoes?: string;
  magalu?: string;
  kabum?: string;
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

// Helper to deduce a simulated discount
function getSimulatedDiscount(id: string): number {
  if (!id) return 20;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 15 + (Math.abs(hash) % 45);
}

export function PlatformModal({ isOpen, onClose, product }: PlatformModalProps) {
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Carrega produtos relacionados ao abrir a modal
  useEffect(() => {
    if (isOpen && product) {
      document.body.style.overflow = "hidden";
      
      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                // Remove o produto atual e seleciona até 4
                const filtered = data.filter((p: any) => p.id !== product.id).slice(0, 4);
                setRelatedProducts(filtered);
            }
        })
        .catch(console.error);

    } else {
      document.body.style.overflow = "unset";
      setRelatedProducts([]); // Clear on close
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, product]);

  if (!product) return null;

  let targetUrl = "";
  let platformName = "";
  if (product.links?.amazon) { targetUrl = product.links.amazon; platformName = "Amazon"; }
  else if (product.links?.mercadoLivre) { targetUrl = product.links.mercadoLivre; platformName = "Mercado Livre"; }
  else if (product.links?.shopee) { targetUrl = product.links.shopee; platformName = "Shopee"; }
  else if (product.links?.aliexpress) { targetUrl = product.links.aliexpress; platformName = "AliExpress"; }
  else if (product.links?.tiktok) { targetUrl = product.links.tiktok; platformName = "TikTok"; }
  else if (product.links?.netshoes) { targetUrl = product.links.netshoes; platformName = "Netshoes"; }
  else if (product.links?.magalu) { targetUrl = product.links.magalu; platformName = "Magalu"; }
  else if (product.links?.kabum) { targetUrl = product.links.kabum; platformName = "Kabum"; }
  else {
    const values = Object.entries(product.links || {});
    const firstValid = values.find(([k, v]) => typeof v === 'string' && v.length > 0);
    if (firstValid) {
        platformName = firstValid[0];
        targetUrl = firstValid[1] as string;
    }
  }

  function handlePlatformClick() {
    if (!targetUrl) return;
    
    // Se houver cupom válido, mostrar modal de cupom primeiro
    if (displayCoupon && displayCoupon.toUpperCase() !== "NORMAL") {
      setShowCouponModal(true);
    } else {
      // Se não houver cupom, ir direto para a loja
      trackAffiliateClick(platformName, product.name, targetUrl);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }
  
  function handleGoToStore() {
    if (!targetUrl) return;
    trackAffiliateClick(platformName, product.name, targetUrl);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  function handleOpenRelated(relatedItem: any) {
    if(!relatedItem?.links) return;
    
    let target = "";
    if (relatedItem.links.amazon) target = relatedItem.links.amazon;
    else if (relatedItem.links.mercadoLivre) target = relatedItem.links.mercadoLivre;
    else if (relatedItem.links.shopee) target = relatedItem.links.shopee;
    else if (relatedItem.links.aliexpress) target = relatedItem.links.aliexpress;
    else if (relatedItem.links.netshoes) target = relatedItem.links.netshoes;
    else if (relatedItem.links.magalu) target = relatedItem.links.magalu;
    else if (relatedItem.links.kabum) target = relatedItem.links.kabum;
    else {
      const v = Object.values(relatedItem.links).find(l => typeof l === 'string' && l.length > 0);
      target = v as string;
    }

    if(target) {
        window.open(target, '_blank', 'noopener,noreferrer');
    }
  }

  const discount = getSimulatedDiscount(product.id || 'abc');
  const price = product.price || 0;
  const originalPrice = price > 0 ? price / (1 - discount / 100) : 0;

  // Garantir que a URL abra corretamente como um link absoluto
  const safeTargetUrl = targetUrl && !targetUrl.startsWith("http") 
    ? "https://" + targetUrl 
    : targetUrl;

  // Buscar cupom do banco de dados (primeiro cupom ativo do produto)
  let displayCoupon = "";
  if (product.coupons && Array.isArray(product.coupons) && product.coupons.length > 0) {
    const firstCoupon = product.coupons[0];
    // Só mostrar se o código não for "NORMAL" ou vazio
    if (firstCoupon.code && firstCoupon.code.toUpperCase() !== "NORMAL") {
      displayCoupon = firstCoupon.code;
    }
  } else if (product.description && typeof product.description === 'string' && product.description.includes('🎟️ CUPOM:')) {
    // Fallback: extrair da descrição se não houver no banco
    const extracted = product.description.split('🎟️ CUPOM:')[1].trim();
    if (extracted && extracted.toUpperCase() !== "NORMAL") {
      displayCoupon = extracted;
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen"
        >
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, y: 0,
              transition: { type: "spring", stiffness: 300, damping: 30 }
            }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-lg bg-[#0a0a0b] border border-white/10 shadow-[0_0_80px_rgba(40,110,250,0.15)] rounded-[2rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden max-h-[90vh] mx-2 sm:mx-0"
          >
            <button 
              onClick={onClose}
              aria-label="Fechar modal"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/10 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} weight="bold" />
            </button>
            
            <div className="overflow-y-auto hidden-scrollbar flex-1 pb-4">
              
              <div className="relative w-full aspect-[3/4] bg-zinc-900 flex items-center justify-center p-4">
                {price > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-red-600 shadow-[0_4px_20px_rgba(220,38,38,0.5)] text-white font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 text-lg">
                    <Tag size={20} weight="fill" />
                    -{discount}%
                  </div>
                )}
                
                <img 
                   src={product.imageUrl} 
                   alt={product.name}
                   className="w-full h-full object-cover rounded-2xl"
                />
              </div>

              <div className="p-6 sm:p-8 pb-4">
                <span className="text-xs font-bold text-accent uppercase tracking-widest">{product.category}</span>
                <h3 className="text-xl md:text-2xl tracking-tight text-white font-semibold mt-2 mb-4 leading-snug">
                  {product.name}
                </h3>

                {displayCoupon && displayCoupon.toUpperCase() !== "NORMAL" && (
                  <div className="flex items-center gap-3 mb-6 p-3 sm:p-4 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-2xl">
                    <div className="bg-accent/20 p-2 rounded-xl text-accent">
                      <Tag size={24} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-0.5">CUPOM DISPONÍVEL</span>
                      <code className="text-white font-mono font-bold text-base sm:text-lg break-all">{displayCoupon}</code>
                    </div>
                  </div>
                )}
                
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

                <button
                  onClick={handlePlatformClick}
                  className="w-full flex items-center justify-center gap-2 group bg-accent hover:bg-accent-light text-white font-bold text-base sm:text-lg py-4 sm:py-5 rounded-2xl transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(40,110,250,0.5)] min-h-[56px]"
                >
                  {displayCoupon && displayCoupon.toUpperCase() !== "NORMAL" ? "Ver Cupom e Ir para Loja" : `Ir para ${platformName}`}
                  <ArrowRight size={22} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-zinc-400 text-sm font-medium">
                  <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
                  Loja Segura Verificada
                </div>

                <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-[#124237] to-[#0A261E] border border-[#25D366]/30 rounded-2xl p-4 sm:p-5 gap-3 flex flex-col items-center text-center shadow-[0_0_40px_rgba(37,211,102,0.1)]">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#25D366]/20 blur-3xl rounded-full" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#25D366]/10 blur-3xl rounded-full" />
                  
                  <div className="relative z-10">
                    <h4 className="text-white font-bold text-sm sm:text-[15px] mb-1">
                      Já está no nosso grupo de promoções?
                    </h4>
                    <p className="text-emerald-100/70 text-xs mb-4 max-w-[260px] mx-auto leading-relaxed">
                      <span className="font-bold text-white">É Grátis!</span> Receba no Whatsapp as melhores promoções e economize mais.
                    </p>
                    
                    <a 
                      href="https://chat.whatsapp.com/KhAQMtgC4kV4gY06AtaGQK?mode=gi_t" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-bold text-sm py-3.5 px-5 rounded-xl transition-all hover:scale-[1.02] min-h-[48px]"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372C7.382 7.07 6.61 7.79 6.61 9.253c0 1.463 1.11 2.876 1.26 3.074.148.198 2.094 3.196 5.076 4.482.71.306 1.264.489 1.696.625.714.227 1.365.195 1.876.118.575-.087 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
                      </svg>
                      Clique aqui para entrar
                    </a>
                  </div>
                </div>

                <p className="mt-8 text-[11px] text-zinc-600 leading-tight text-center max-w-sm mx-auto">
                  *Preço e disponibilidade sujeito a alteração a qualquer momento dependendo da loja parceira.
                </p>
              </div>

              {/* Related Offers Section Inside Modal */}
              {relatedProducts.length > 0 && (
                <div className="border-t border-white/5 mt-4 pt-6 sm:pt-8 px-4 sm:px-8 bg-black/20">
                  <h4 className="text-base sm:text-lg font-bold text-white mb-4">Veja mais ofertas de hoje</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {relatedProducts.map((relItem) => (
                       <button 
                         key={relItem.id}
                         onClick={() => handleOpenRelated(relItem)}
                         className="group bg-zinc-900 border border-white/5 hover:border-accent/30 rounded-xl overflow-hidden flex flex-col text-left transition-all hover:scale-[1.02] min-h-[44px]"
                       >
                         <div className="w-full aspect-[3/4] bg-zinc-900 rounded-xl flex items-center justify-center overflow-hidden">
                           <img 
                              src={relItem.imageUrl} 
                              alt={relItem.name} 
                              className="w-full h-full object-cover"
                           />
                         </div>
                         <div className="p-3 bg-zinc-900 border-t border-white/5">
                            <h5 className="font-semibold text-white text-xs line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                              {relItem.name}
                            </h5>
                            <span className="text-accent text-sm font-bold block mt-1">
                               {relItem.price > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relItem.price) : 'Ver Promoção'}
                            </span>
                         </div>
                       </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Modal de Cupom */}
          {displayCoupon && displayCoupon.toUpperCase() !== "NORMAL" && (
            <CouponModal
              isOpen={showCouponModal}
              onClose={() => setShowCouponModal(false)}
              couponCode={displayCoupon}
              productName={product.name}
              platformName={platformName}
              affiliateUrl={safeTargetUrl}
              onGoToStore={handleGoToStore}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
