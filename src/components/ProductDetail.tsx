"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Tag, Copy, Check, Bell, ThumbsUp, ThumbsDown, WhatsappLogo, ChatText, PaperPlaneRight, User } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CouponModal } from "./CouponModal";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { AlertButton } from "./AlertButton";
import { ProductReviews } from "./ProductReviews";

type Product = {
  id: string;
  shortId?: number;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string;
  price: number | null;
  originalPrice: number | null;
  couponLink?: string | null;
  links?: {
    amazon?: string | null;
    mercadoLivre?: string | null;
    shopee?: string | null;
    aliexpress?: string | null;
    tiktok?: string | null;
  } | null;
  coupons?: Array<{
    code: string;
    description: string;
    discount: string;
  }>;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
};

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [votes, setVotes] = useState({ likes: 0, dislikes: 0, userVote: null as string | null });
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [visibleRelatedCount, setVisibleRelatedCount] = useState(10);
  
  const commentsRef = useRef<HTMLDivElement>(null);

  // Load related products, votes and comments
  useEffect(() => {
    fetch(`/api/products/${product.id}/similar?limit=8`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRelatedProducts(data);
        }
      })
      .catch(console.error);

    fetch(`/api/products/${product.id}/vote`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setVotes({
            likes: data.likes,
            dislikes: data.dislikes,
            userVote: user ? data.votes?.find((v: any) => v.userId === user?.id)?.type || null : null
          });
        }
      });

    fetch(`/api/products/${product.id}/comments`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data);
      });
  }, [product.id, user]);

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

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !requireAuth()) return;

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
    const linkPath = product.shortId ? `/produto/${product.shortId}` : `/produto/${product.id}`;
    const fullLink = `${window.location.origin}${linkPath}`;
    const text = encodeURIComponent(`🔥 *Olha essa promoção!* 🔥\n\n${product.name}\n\n👉 Acesse aqui: ${fullLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  // Determine target platform
  let targetUrl = "";
  let platformName = "";
  if (product.links?.amazon) { targetUrl = product.links.amazon; platformName = "Amazon"; }
  else if (product.links?.mercadoLivre) { targetUrl = product.links.mercadoLivre; platformName = "Mercado Livre"; }
  else if (product.links?.shopee) { targetUrl = product.links.shopee; platformName = "Shopee"; }
  else if (product.links?.aliexpress) { targetUrl = product.links.aliexpress; platformName = "AliExpress"; }
  else if (product.links?.tiktok) { targetUrl = product.links.tiktok; platformName = "TikTok"; }
  else {
    const values = Object.entries(product.links || {});
    const firstValid = values.find(([k, v]) => typeof v === 'string' && v.length > 0);
    if (firstValid) {
      platformName = firstValid[0];
      targetUrl = firstValid[1] as string;
    }
  }

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

  function handlePlatformClick() {
    if (!targetUrl) return;
    
    if (displayCoupon && displayCoupon.toUpperCase() !== "NORMAL") {
      setShowCouponModal(true);
    } else {
      trackAffiliateClick(platformName, product.name, targetUrl);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }
  
  function handleGoToStore() {
    if (!targetUrl) return;
    trackAffiliateClick(platformName, product.name, targetUrl);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  const price = product.price || 0;
  const originalPrice = product.originalPrice || 0;
  const discount = (originalPrice > price && price > 0)
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const safeTargetUrl = targetUrl && !targetUrl.startsWith("http") 
    ? "https://" + targetUrl 
    : targetUrl;

  // Find coupon
  let displayCoupon = "";
  if (product.coupons && Array.isArray(product.coupons) && product.coupons.length > 0) {
    const firstCoupon = product.coupons[0];
    if (firstCoupon.code && firstCoupon.code.toUpperCase() !== "NORMAL") {
      displayCoupon = firstCoupon.code;
    }
  } else if (product.description && typeof product.description === 'string' && product.description.includes('🎟️ CUPOM:')) {
    const extracted = product.description.split('🎟️ CUPOM:')[1].trim();
    if (extracted && extracted.toUpperCase() !== "NORMAL") {
      displayCoupon = extracted;
    }
  }

  return (
    <main className="min-h-screen text-white pt-24 md:pt-28 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Voltar para Home
        </button>

        <div className="w-full glass-3d-card rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
          
          {/* Image Section */}
          <div className="relative w-full md:w-5/12 bg-white border-b md:border-b-0 md:border-r border-white/5 flex flex-col p-6 lg:p-10 min-h-[300px] md:min-h-[450px] rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none">
            {price > 0 && discount > 0 && (
              <motion.div 
                initial={{ scale: 0, rotate: -10 }} 
                animate={{ scale: 1, rotate: 0 }} 
                className="absolute top-6 left-6 z-10 bg-red-600 shadow-[0_4px_20px_rgba(220,38,38,0.5)] text-white font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 text-xl"
              >
                <Tag size={22} weight="fill" />
                -{discount}%
              </motion.div>
            )}
            
            <div className="flex-1 flex items-center justify-center relative group">
              {(product.images && product.images.length > 1) && (
                <button 
                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : product.images!.length - 1)}
                  className="absolute left-0 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent focus:outline-none"
                >
                  <ArrowLeft size={20} weight="bold" />
                </button>
              )}

              <motion.img 
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={product.images && product.images.length > 0 ? product.images[currentImageIndex].url : product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform hover:scale-105 duration-500 max-h-[350px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.webp";
                }}
              />

              {(product.images && product.images.length > 1) && (
                <button 
                  onClick={() => setCurrentImageIndex(prev => prev < product.images!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-0 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent focus:outline-none"
                >
                  <ArrowRight size={20} weight="bold" />
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx ? 'border-accent scale-105 opacity-100' : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img.url} 
                      alt={`Thumbnail ${idx}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 md:p-8 lg:p-10 flex flex-col w-full md:w-7/12">
            <span className="text-sm font-bold text-accent uppercase tracking-widest bg-accent/10 w-fit px-3 py-1 rounded-full">{product.category}</span>
            <h1 className="text-xl md:text-2xl tracking-tight text-[#8e92a4] font-normal uppercase mt-4 mb-6 leading-tight">
              {product.name}
            </h1>
            
            {price > 0 ? (
              <div className="flex flex-row items-center gap-4 mb-8">
                <span className="text-4xl md:text-5xl font-normal text-white tracking-tighter leading-none">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                </span>
                {discount > 0 && (
                  <span className="text-lg md:text-xl text-zinc-500 font-medium line-through">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-zinc-300">Verifique o preço atualizado diretamente no site da loja.</p>
              </div>
            )}

            {/* Coupon Box */}
            {displayCoupon && displayCoupon.toUpperCase() !== "NORMAL" && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCouponModal(true)}
                className="w-full flex items-center justify-between px-5 h-[52px] mb-4 bg-gradient-to-r from-accent/20 to-accent/5 hover:from-accent/30 hover:to-accent/10 border border-accent/30 rounded-2xl transition-all group shadow-lg"
              >
                <code className="text-white font-mono font-bold text-lg md:text-xl drop-shadow-md">{displayCoupon}</code>
                <div className="text-white group-hover:text-accent transition-colors">
                  <Copy size={22} weight="duotone" />
                </div>
              </motion.button>
            )}

            {product.couponLink ? (
              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={() => window.open(product.couponLink!, '_blank', 'noopener,noreferrer')}
                  className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 transition-colors text-zinc-950 font-black text-base md:text-lg h-[52px] rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.3)]"
                >
                  🎟️ Resgatar Cupom
                </button>
                <button
                  onClick={handlePlatformClick}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 transition-colors text-white font-bold text-base md:text-lg h-[52px] rounded-2xl border border-zinc-700"
                >
                  🛒 Ir para o Produto
                  <ArrowRight size={22} weight="bold" className="group-hover:translate-x-1.5 transition-transform" />
                </button>
                <p className="text-xs text-center text-zinc-400 mt-1 leading-relaxed">
                  Clique primeiro em <strong>Resgatar Cupom</strong>, depois acesse o produto para o desconto ser aplicado.
                </p>
              </div>
            ) : (
              <button
                onClick={handlePlatformClick}
                className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold text-base md:text-lg h-[52px] rounded-2xl shadow-[0_8px_30px_rgba(220,38,38,0.3)] mt-auto"
              >
                Ir para {platformName}
                <ArrowRight size={22} weight="bold" className="group-hover:translate-x-1.5 transition-transform" />
              </button>
            )}

            <div className="flex justify-between items-center mt-6 px-2">
              <AlertButton productId={product.id} />

              <div className="flex items-center gap-4 bg-white/5 px-4 py-2.5 rounded-2xl">
                <button onClick={() => handleVote('LIKE')} className={`flex items-center gap-1.5 transition-colors ${votes.userVote === 'LIKE' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}>
                  <ThumbsUp size={24} weight={votes.userVote === 'LIKE' ? "fill" : "regular"} />
                  {votes.likes > 0 && <span className="text-sm font-bold">{votes.likes}</span>}
                </button>
                <div className="w-[1px] h-6 bg-white/10" />
                <button onClick={() => handleVote('DISLIKE')} className={`flex items-center gap-1.5 transition-colors ${votes.userVote === 'DISLIKE' ? 'text-red-400' : 'text-zinc-400 hover:text-white'}`}>
                  <ThumbsDown size={24} weight={votes.userVote === 'DISLIKE' ? "fill" : "regular"} />
                  {(votes.userVote === 'DISLIKE' && votes.dislikes > 0) && <span className="text-sm font-bold">{votes.dislikes}</span>}
                </button>
              </div>

              <button onClick={handleShare} className="p-3 rounded-2xl transition-all text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 shadow-[0_4px_20px_rgba(37,211,102,0.15)]">
                <WhatsappLogo size={24} weight="fill" />
              </button>
            </div>

            <PriceHistoryChart productId={product.id} />
          </div>
        </div>

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

        {/* Comments Section */}
        <div ref={commentsRef} className="mt-12 glass-3d-card rounded-[2.5rem] p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-accent/20 rounded-2xl text-accent">
              <ChatText size={28} weight="fill" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Comentários</h4>
              <p className="text-sm text-zinc-400">{comments.length} avaliações da comunidade</p>
            </div>
          </div>
          
          <form onSubmit={handlePostComment} className="flex gap-3 mb-10">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 border-2 border-white/10">
                <User size={24} />
              </div>
            )}
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={user ? "Compartilhe sua opinião sobre este produto..." : "Faça login para comentar"}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-5 pr-14 text-white placeholder:text-zinc-500 focus:outline-none focus:border-accent/50 focus:bg-black/60 transition-colors shadow-inner"
                disabled={isSubmitting || !user}
              />
              {user && (
                <button 
                  type="submit" 
                  disabled={!newComment.trim() || isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent text-white hover:bg-accent-light rounded-xl disabled:opacity-40 transition-colors"
                >
                  <PaperPlaneRight size={20} weight="fill" />
                </button>
              )}
            </div>
          </form>

          <div className="space-y-4">
            {comments.map((comment, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={comment.id} 
                className="flex gap-4 p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors"
              >
                {comment.user?.image ? (
                  <img src={comment.user.image} alt={comment.user.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 shadow-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <span className="text-sm font-bold">{comment.user?.name?.charAt(0) || comment.guestName?.charAt(0) || 'A'}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-bold text-white">{comment.user?.name || comment.guestName || 'Anônimo'}</span>
                    <span className="text-xs text-zinc-500 font-medium bg-black/30 px-2 py-0.5 rounded-md">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(comment.createdAt))}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{comment.text}</p>
                </div>
              </motion.div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-10 bg-black/20 rounded-3xl border border-dashed border-white/10 text-zinc-500">
                Nenhum comentário ainda. Seja o primeiro a avaliar!
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 glass-3d-card rounded-[2.5rem] p-6 sm:p-10">
            <h4 className="text-xl md:text-2xl font-bold text-white mb-6">Ofertas Relacionadas</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {relatedProducts.slice(0, visibleRelatedCount).map((relItem) => (
                <button 
                  key={relItem.id}
                  onClick={() => router.push(`/produto/${relItem.shortId || relItem.id}`)}
                  className="group bg-black/40 border border-white/5 hover:border-accent/30 rounded-3xl overflow-hidden flex flex-col text-left transition-all hover:-translate-y-1 duration-300"
                >
                  <div className="w-full aspect-square bg-white flex items-center justify-center overflow-hidden p-3 rounded-t-2xl">
                    <img 
                      src={relItem.imageUrl} 
                      alt={relItem.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-all duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.webp";
                      }}
                    />
                  </div>
                  <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex-1 flex flex-col">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1 line-clamp-1">{relItem.category}</span>
                    <h5 className="font-semibold text-white text-sm line-clamp-2 leading-tight group-hover:text-accent-light transition-colors mb-2">
                      {relItem.name}
                    </h5>
                    <span className="text-white text-base font-black mt-auto">
                      {relItem.price > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relItem.price) : 'Ver Oferta'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {visibleRelatedCount < relatedProducts.length && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setVisibleRelatedCount(prev => prev + 10)}
                  className="text-white border border-white/10 hover:bg-white/5 font-semibold text-sm py-3 px-8 rounded-xl transition-all"
                >
                  Ver mais ofertas ({relatedProducts.length - visibleRelatedCount})
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modals */}
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
    </main>
  );
}
