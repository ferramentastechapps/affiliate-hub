"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { X, ArrowRight, ShieldCheck, Tag, Bell, ThumbsUp, ThumbsDown, WhatsappLogo, ChatText, PaperPlaneRight, User, Copy, Check } from "@phosphor-icons/react";
import { CouponModal } from "./CouponModal";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";

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

const categoryColors: Record<string, string> = {
  "Todas": "#f43f5e",
  "Smartphones e TV": "#3b82f6",
  "Informática e Games": "#8b5cf6",
  "Casa e Eletrodomésticos": "#10b981",
  "Moda e Acessórios": "#ec4899",
  "Bebês e Crianças": "#f97316",
  "Saúde e Beleza": "#14b8a6",
  "Esporte e Suplementos": "#ef4444",
  "Supermercado e Delivery": "#84cc16",
  "Livros, eBooks e eReaders": "#a855f7",
  "Ferramentas e Jardim": "#eab308",
  "Automotivo": "#64748b",
  "Pet": "#0ea5e9",
  "Viagem": "#6366f1",
  "Diversos": "#a1a1aa"
};

type PlatformModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectRelated?: (product: any) => void;
  autoFocusComments?: boolean;
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

export function PlatformModal({ isOpen, onClose, product, onSelectRelated, autoFocusComments }: PlatformModalProps) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [votes, setVotes] = useState({ likes: 0, dislikes: 0, userVote: null as string | null });
  const [hasAlert, setHasAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(10);
  const [showCouponModal, setShowCouponModal] = useState(false);
  
  const commentsRef = useRef<HTMLDivElement>(null);

  // Carrega produtos relacionados e dados de interação ao abrir a modal
  useEffect(() => {
    if (isOpen && product) {
      document.body.style.overflow = "hidden";
      
      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                // Remove o produto atual
                const filtered = data.filter((p: any) => p.id !== product.id);
                setRelatedProducts(filtered);
            }
        })
        .catch(console.error);

      // Fetch votes
      fetch(`/api/products/${product.id}/vote`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setVotes({
              likes: data.likes,
              dislikes: data.dislikes,
              userVote: user ? data.votes.find((v: any) => v.userId === user?.id)?.type || null : null
            });
          }
        });

      // Fetch comments
      fetch(`/api/products/${product.id}/comments`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setComments(data);
        });

      // Reset alert state if a new product is opened
      setHasAlert(false);
      setVisibleRelatedCount(10);

      if (autoFocusComments) {
        setTimeout(() => {
          commentsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }

    } else {
      document.body.style.overflow = "unset";
      setRelatedProducts([]); // Clear on close
      setComments([]);
      setVotes({ likes: 0, dislikes: 0, userVote: null });
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, product, user]);

  function requireAuth() {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  }

  async function handleVote(type: 'LIKE' | 'DISLIKE') {
    if (!requireAuth()) return;
    try {
      const newType = votes.userVote === type ? 'REMOVE' : type;
      // Optimistic update
      setVotes(prev => {
        let { likes, dislikes } = prev;
        if (prev.userVote === 'LIKE') likes--;
        if (prev.userVote === 'DISLIKE') dislikes--;
        
        if (newType === 'LIKE') likes++;
        if (newType === 'DISLIKE') dislikes++;
        
        return { likes, dislikes, userVote: newType === 'REMOVE' ? null : newType };
      });

      await fetch(`/api/products/${product.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, type: newType })
      });
    } catch (e) { console.error(e); }
  }

  async function handleAlert() {
    if (!requireAuth()) return;
    try {
      setHasAlert(true);
      await fetch(`/api/products/${product.id}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id })
      });
    } catch (e) { console.error(e); }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!requireAuth()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${product.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment, userId: user!.id })
      });
      const data = await res.json();
      if (!data.error) {
        setComments([data, ...comments]);
        setNewComment("");
      }
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  }

  function handleShare() {
    const text = encodeURIComponent(`Olha essa promoção que eu achei: ${product.name}\n\n${window.location.origin}/?p=${product.id}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

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
    if (onSelectRelated) {
      onSelectRelated(relatedItem);
    } else {
      window.open(`/produto/${relatedItem.id}`, '_self');
    }
  }

  const price = product.price || 0;
  const originalPrice = product.originalPrice || 0;
  const discount = (originalPrice > price && price > 0)
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

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
              
              <div className="relative w-full bg-zinc-900 flex items-center justify-center p-4" style={{ minHeight: '220px', maxHeight: '380px' }}>
                {price > 0 && discount > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-red-600 shadow-[0_4px_20px_rgba(220,38,38,0.5)] text-white font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 text-lg">
                    <Tag size={20} weight="fill" />
                    -{discount}%
                  </div>
                )}
                
                <img 
                   src={product.imageUrl} 
                   alt={product.name}
                   className="w-full h-full object-contain rounded-2xl"
                   style={{ maxHeight: '360px' }}
                   onError={(e) => {
                     (e.target as HTMLImageElement).src = "/placeholder.webp";
                   }}
                />
              </div>


              <div className="p-4 sm:p-8 pb-4">
                <span 
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: categoryColors[product.category] || "#8e92a4" }}
                >
                  {product.category || "OFERTA"}
                </span>
                <h3 className="text-lg md:text-xl font-normal text-[#8e92a4] uppercase mt-2 mb-4 leading-snug">
                  {product.name}
                </h3>


                
                {price > 0 ? (
                  <div className="flex flex-row items-center gap-3 mb-4 border border-white/5 bg-white/5 rounded-2xl p-5">
                    <span className="text-3xl font-black text-white tracking-tighter leading-none">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                    </span>
                    {discount > 0 && (
                      <span className="text-sm text-zinc-500 font-medium line-through">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-zinc-300">Verifique o preço atualizado diretamente no site da loja.</p>
                  </div>
                )}

                {/* Action Bar (Alert, Likes, Share) */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-6 w-full overflow-x-auto pb-2 hidden-scrollbar">
                  <button 
                    onClick={handleAlert}
                    className={`flex-1 py-2 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${hasAlert ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'}`}
                  >
                    <Bell size={18} weight={hasAlert ? "fill" : "regular"} />
                    <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">{hasAlert ? 'Alerta Ativo' : 'Alerta'}</span>
                  </button>

                  <button 
                    onClick={() => handleVote('LIKE')}
                    className={`flex-1 py-2 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${votes.userVote === 'LIKE' ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30' : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20'}`}
                  >
                    <ThumbsUp size={18} weight={votes.userVote === 'LIKE' ? "fill" : "regular"} />
                    <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">{votes.likes > 0 ? votes.likes : 'Curtir'}</span>
                  </button>

                  <button 
                    onClick={() => handleVote('DISLIKE')}
                    className={`flex-1 py-2 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${votes.userVote === 'DISLIKE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-transparent'}`}
                  >
                    <ThumbsDown size={18} weight={votes.userVote === 'DISLIKE' ? "fill" : "regular"} />
                    <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">{votes.dislikes > 0 ? votes.dislikes : 'Não Curtir'}</span>
                  </button>

                  <button 
                    onClick={handleShare}
                    className="flex-1 py-2 px-1 sm:px-2 rounded-xl flex flex-col items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1DA851] text-white transition-colors shadow-md"
                  >
                    <WhatsappLogo size={18} />
                    <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Mandar</span>
                  </button>
                </div>

                {displayCoupon && displayCoupon.toUpperCase() !== "NORMAL" && (
                  <button 
                    onClick={() => setShowCouponModal(true)}
                    className="w-full flex items-center text-left gap-3 mb-4 p-3 sm:p-4 bg-gradient-to-r from-accent/20 to-accent/5 hover:from-accent/30 hover:to-accent/10 border border-accent/30 rounded-2xl transition-all group"
                  >
                    <div className="bg-accent/20 p-2 rounded-xl text-accent">
                      <Tag size={24} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center">
                      <code className="text-white font-mono font-bold text-lg sm:text-xl break-all">{displayCoupon}</code>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl text-white group-hover:bg-white/20 transition-colors">
                      <Copy size={20} weight="duotone" />
                    </div>
                  </button>
                )}

                <button
                  onClick={handlePlatformClick}
                  className="w-full flex items-center justify-center gap-2 group btn-3d text-white font-bold text-base sm:text-lg py-4 sm:py-5 rounded-[20px] min-h-[56px]"
                >
                  Ir para {platformName}
                  <ArrowRight size={22} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-zinc-400 text-sm font-medium">
                  <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
                  Loja Segura Verificada
                </div>

                {/* Comments Section */}
                <div ref={commentsRef} className="mt-8 border-t border-white/5 pt-6 pb-2">
                  <div className="flex items-center gap-2 mb-4">
                    <ChatText size={20} className="text-zinc-400" />
                    <h4 className="text-sm font-bold text-white">Comentários {comments.length > 0 && `(${comments.length})`}</h4>
                  </div>
                  
                  <form onSubmit={handlePostComment} className="flex gap-2 mb-6">
                    {user?.image ? (
                      <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 border border-white/10">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder={user ? "Adicione um comentário..." : "Faça login para comentar"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-colors"
                        disabled={isSubmitting || !user}
                      />
                      {user && (
                        <button 
                          type="submit" 
                          disabled={!newComment.trim() || isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-accent hover:text-accent-light disabled:opacity-40 transition-colors"
                        >
                          <PaperPlaneRight size={20} weight="fill" />
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto hidden-scrollbar pr-1">
                    {comments.map((comment, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={comment.id} 
                        className="flex gap-3"
                      >
                        {comment.user?.image ? (
                          <img src={comment.user.image} alt={comment.user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-500 shrink-0">
                            <span className="text-[10px] font-bold">{comment.user?.name?.charAt(0) || comment.guestName?.charAt(0) || 'A'}</span>
                          </div>
                        )}
                        <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/5">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold text-zinc-200">{comment.user?.name || comment.guestName || 'Anônimo'}</span>
                            <span className="text-[10px] text-zinc-500">
                              {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(comment.createdAt))}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{comment.text}</p>
                        </div>
                      </motion.div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-6 text-zinc-500 text-sm">
                        Nenhum comentário ainda. Seja o primeiro!
                      </div>
                    )}
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
                    {relatedProducts.slice(0, visibleRelatedCount).map((relItem) => (
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
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.webp";
                              }}
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
                  
                  {visibleRelatedCount < relatedProducts.length && (
                    <div className="flex justify-center mt-2 mb-2">
                      <button
                        onClick={() => setVisibleRelatedCount(prev => prev + 10)}
                        className="text-white border border-white/10 hover:bg-white/5 font-semibold text-xs py-2.5 px-6 rounded-lg transition-all"
                      >
                        Ver mais ofertas ({relatedProducts.length - visibleRelatedCount})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* WhatsApp Community Banner */}
              <div className="mt-4 px-4 sm:px-8 pb-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#124237] to-[#0A261E] border border-[#25D366]/30 rounded-2xl p-4 sm:p-5 gap-3 flex flex-col items-center text-center shadow-[0_0_40px_rgba(37,211,102,0.1)]">
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
              </div>

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
              imageUrl={product.imageUrl}
              onGoToStore={handleGoToStore}
            />
          )}

          <AuthPanel isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
