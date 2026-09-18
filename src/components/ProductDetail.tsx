"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Tag, Copy, Check, Bell, ThumbsUp, ThumbsDown, WhatsappLogo, ChatText, PaperPlaneRight, User, Crown, Heart } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CouponModal } from "./CouponModal";
import { useAuth } from "./AuthProvider";
import { AuthPanel } from "./AuthPanel";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { PriceComparator } from "./PriceComparator";
import { AlertButton } from "./AlertButton";
import { ProductReviews } from "./ProductReviews";

type Product = {
  id: string;
  shortId?: number;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string;
  enhancedImageUrl?: string | null;
  price: number | null;
  originalPrice: number | null;
  couponLink?: string | null;
  links?: {
    amazon?: string | null;
    mercadoLivre?: string | null;
    shopee?: string | null;
    aliexpress?: string | null;
    tiktok?: string | null;
    netshoes?: string | null;
    magalu?: string | null;
    kabum?: string | null;
  } | null;
  productLinks?: Array<{
    platform: string;
    sourceUrl?: string | null;
    affiliateUrl?: string | null;
    generatedAffiliateUrl?: string | null;
  }>;
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

type LowestPriceInfo = {
  isLowest: boolean;
  days: number;
  minPrice: number;
  maxPrice: number;
  savings: number;
} | null;

const PLATFORM_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  mercadoLivre: 'Mercado Livre',
  shopee: 'Shopee',
  aliexpress: 'AliExpress',
  tiktok: 'TikTok',
  magalu: 'Magalu',
  kabum: 'KaBuM',
  netshoes: 'Netshoes',
};

const KNOWN_LINK_FIELDS = Object.keys(PLATFORM_LABELS);

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function formatBrl(val: number): string {
  return brlFormatter.format(val);
}

export function formatShortDate(val: string | Date): string {
  return shortDateFormatter.format(new Date(val));
}

function resolveTargetUrlAndPlatform(product: Product) {
  let targetUrl = "";
  let platformName = "";

  if (product.productLinks && product.productLinks.length > 0) {
    const pl = product.productLinks[0];
    const url = pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl;
    if (url) {
      targetUrl = url;
      platformName = PLATFORM_LABELS[pl.platform] || pl.platform;
    }
  }

  if (!targetUrl && product.links) {
    for (const key of KNOWN_LINK_FIELDS) {
      const val = (product.links as any)[key];
      if (typeof val === 'string' && val.length > 0) {
        targetUrl = val;
        platformName = PLATFORM_LABELS[key] || key;
        break;
      }
    }
  }

  return { targetUrl, platformName };
}

function extractProductCouponAndConditions(product: Product) {
  let displayCoupon = '';
  if (product.coupons && product.coupons.length > 0) {
    displayCoupon = product.coupons[0].code;
  } else if (product.description?.includes('🎟️ CUPOM:')) {
    displayCoupon = product.description.split('🎟️ CUPOM:')[1].split('\n')[0].trim();
  }

  let condicoesMsg = "";
  const desc = product.description || '';
  let descSemCupom = desc.split('🎟️ CUPOM:')[0].trim();
  descSemCupom = descSemCupom.replace(/Oferta na loja[^\n]+no[^\n]+/gi, '').trim();

  if (descSemCupom && descSemCupom !== 'Oferta encaminhada de grupos') {
    condicoesMsg = descSemCupom;
  }

  return { displayCoupon, condicoesMsg };
}

function resolveDetailMainImage(product: Product, currentImageIndex: number): string {
  if (product.images && product.images.length > 0) {
    return product.images[currentImageIndex]?.url || "/placeholder.webp";
  }
  if (product.imageUrl && product.imageUrl !== '/placeholder.webp' && !product.imageUrl.includes('unavailable')) {
    return product.imageUrl;
  }
  if (product.enhancedImageUrl && product.enhancedImageUrl !== '/placeholder.webp' && !product.enhancedImageUrl.includes('unavailable')) {
    return product.enhancedImageUrl;
  }
  return "/placeholder.webp";
}

export function ProductDetail({ product, lowestPriceInfo }: { product: Product; lowestPriceInfo?: LowestPriceInfo }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

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

  // Inicializa estado de favoritos (localStorage para visitantes + API se logado)
  useEffect(() => {
    let isMounted = true;
    try {
      const stored = localStorage.getItem("economizei_favorites");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        if (ids.includes(product.id) && isMounted) {
          setIsFavorited(true);
        }
      }
    } catch {}

    if (user) {
      fetch(`/api/favorites?productId=${product.id}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && typeof data.isFavorited === 'boolean') {
            setIsFavorited(data.isFavorited);
          }
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, [product.id, user]);

  async function handleToggleFavorite() {
    setFavLoading(true);
    const nextState = !isFavorited;
    setIsFavorited(nextState);

    try {
      const stored = localStorage.getItem("economizei_favorites");
      let ids: string[] = stored ? JSON.parse(stored) : [];
      if (nextState) {
        if (!ids.includes(product.id)) ids.push(product.id);
      } else {
        ids = ids.filter(id => id !== product.id);
      }
      localStorage.setItem("economizei_favorites", JSON.stringify(ids));
      window.dispatchEvent(new CustomEvent("favorites-updated", { detail: { count: ids.length } }));
    } catch {}

    if (user) {
      try {
        await fetch('/api/favorites', {
          method: nextState ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        });
      } catch (err) {
        console.error("Erro ao sincronizar favorito:", err);
      }
    }
    setFavLoading(false);
  }

  // Load related products, votes and comments
  useEffect(() => {
    let isMounted = true;

    fetch(`/api/products/${product.id}/similar?limit=8`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setRelatedProducts(data);
        }
      })
      .catch(console.error);

    fetch(`/api/products/${product.id}/vote`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && !data.error) {
          setVotes({
            likes: data.likes,
            dislikes: data.dislikes,
            userVote: user ? data.votes?.find((v: any) => v.userId === user?.id)?.type || null : null
          });
        }
      })
      .catch(() => {});

    fetch(`/api/products/${product.id}/comments`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) setComments(data);
      })
      .catch(() => {});

    return () => { isMounted = false; };
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

  const { targetUrl, platformName } = resolveTargetUrlAndPlatform(product);
  const { displayCoupon, condicoesMsg } = extractProductCouponAndConditions(product);

  function trackAffiliateClick(platform: string, productName: string, url: string) {
    try {
      fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: product.id || product.shortId, 
          platform, 
          channel: 'website' 
        })
      }).catch(err => console.error('Erro ao salvar click log:', err));

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
          <ProductImageGallery
            product={product}
            currentImageIndex={currentImageIndex}
            onSelectImage={setCurrentImageIndex}
            price={price}
            discount={discount}
          />

          {/* Details Section */}
          <div className="p-6 md:p-8 lg:p-10 flex flex-col w-full md:w-7/12">
            <span className="text-sm font-bold text-accent uppercase tracking-widest bg-accent/10 w-fit px-3 py-1 rounded-full">{product.category}</span>
            <h1 className="text-xl md:text-2xl tracking-tight text-[#8e92a4] font-normal uppercase mt-4 mb-4 leading-tight">
              {product.name}
            </h1>

            {/* Badge de Menor Preço em X Dias */}
            {lowestPriceInfo?.isLowest && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mb-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 shadow-[0_4px_16px_rgba(20,184,166,0.15)] w-fit"
              >
                <span className="text-base">🏆</span>
                <div className="flex flex-col">
                  <span className="text-xs font-black tracking-tight leading-tight">
                    Menor preço em {lowestPriceInfo.days} dias!
                  </span>
                  {lowestPriceInfo.savings > 0 && (
                    <span className="text-[10px] text-teal-200/80 font-medium">
                      Economize até {formatBrl(lowestPriceInfo.savings)} vs valor mais alto registrado
                    </span>
                  )}
                </div>
              </motion.div>
            )}
            
            {price > 0 ? (
              <div className="flex flex-row items-center gap-4 mb-8">
                <span className="text-4xl md:text-5xl font-normal text-white tracking-tighter leading-none">
                  {formatBrl(price)}
                </span>
                {discount > 0 && (
                  <span className="text-lg md:text-xl text-zinc-500 font-medium line-through">
                    {formatBrl(originalPrice)}
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-zinc-300">Verifique o preço atualizado diretamente no site da loja.</p>
              </div>
            )}

            {condicoesMsg && (
              <div className="mb-8 flex items-center gap-3 p-4 rounded-xl border shadow-sm bg-accent/5 border-accent/20 text-zinc-300">
                <span className="text-xl">↪️</span>
                <p className="font-semibold text-[15px] leading-snug">{condicoesMsg}</p>
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

            <ProductActionBar
              productId={product.id}
              isFavorited={isFavorited}
              favLoading={favLoading}
              onToggleFavorite={handleToggleFavorite}
              votes={votes}
              onVote={handleVote}
              onShare={handleShare}
            />

            <PriceHistoryChart productId={product.id} />

            {/* Comparador de Lojas */}
            <PriceComparator
              productId={product.id}
              productLinks={product.productLinks}
              legacyLinks={product.links}
              currentPrice={product.price}
              onLinkClick={(platform, url) => trackAffiliateClick(platform, product.name, url)}
            />
          </div>
        </div>

        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

        {/* Comments Section */}
        <ProductCommentsSection
          comments={comments}
          user={user}
          newComment={newComment}
          isSubmitting={isSubmitting}
          commentsRef={commentsRef}
          onCommentChange={setNewComment}
          onPostComment={handlePostComment}
        />

        {/* Related Products */}
        <RelatedProductsSection
          relatedProducts={relatedProducts}
          visibleCount={visibleRelatedCount}
          onSelectProduct={(relItem) => router.push(`/produto/${relItem.shortId || relItem.id}`)}
          onLoadMore={() => setVisibleRelatedCount(prev => prev + 10)}
        />

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

// ── Subcomponents ──

interface ProductImageGalleryProps {
  product: Product;
  currentImageIndex: number;
  onSelectImage: React.Dispatch<React.SetStateAction<number>>;
  price: number;
  discount: number;
}

function ProductImageGallery({
  product,
  currentImageIndex,
  onSelectImage,
  price,
  discount,
}: ProductImageGalleryProps) {
  const hasMultipleImages = Boolean(product.images && product.images.length > 1);

  return (
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
        {hasMultipleImages && (
          <button 
            onClick={() => onSelectImage(prev => prev > 0 ? prev - 1 : product.images!.length - 1)}
            className="absolute left-0 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent focus:outline-none"
            aria-label="Imagem anterior"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
        )}

        <motion.img 
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={resolveDetailMainImage(product, currentImageIndex)} 
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply transition-transform hover:scale-105 duration-500 max-h-[350px]"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (product.enhancedImageUrl && target.src !== product.enhancedImageUrl && !product.enhancedImageUrl.includes('unavailable')) {
              target.src = product.enhancedImageUrl;
            } else {
              target.src = "/placeholder.webp";
            }
          }}
        />

        {hasMultipleImages && (
          <button 
            onClick={() => onSelectImage(prev => prev < product.images!.length - 1 ? prev + 1 : 0)}
            className="absolute right-0 z-20 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent focus:outline-none"
            aria-label="Próxima imagem"
          >
            <ArrowRight size={20} weight="bold" />
          </button>
        )}
      </div>

      {hasMultipleImages && (
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {product.images!.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => onSelectImage(idx)}
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
  );
}

interface ProductActionBarProps {
  productId: string;
  isFavorited: boolean;
  favLoading: boolean;
  onToggleFavorite: () => void;
  votes: { likes: number; dislikes: number; userVote: string | null };
  onVote: (type: 'LIKE' | 'DISLIKE') => void;
  onShare: () => void;
}

function ProductActionBar({
  productId,
  isFavorited,
  favLoading,
  onToggleFavorite,
  votes,
  onVote,
  onShare,
}: ProductActionBarProps) {
  return (
    <div className="flex justify-between items-center mt-6 px-2">
      <div className="flex items-center gap-2">
        <AlertButton productId={productId} />
        <button
          onClick={onToggleFavorite}
          disabled={favLoading}
          title={isFavorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className={`p-3 rounded-2xl transition-all flex items-center justify-center ${
            isFavorited
              ? "text-rose-400 bg-rose-500/20 border border-rose-500/30 shadow-[0_4px_20px_rgba(244,63,94,0.25)] scale-105"
              : "text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-rose-400 border border-white/5"
          }`}
        >
          <Heart size={24} weight={isFavorited ? "fill" : "regular"} className={isFavorited ? "text-rose-500" : ""} />
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white/5 px-4 py-2.5 rounded-2xl">
        <button onClick={() => onVote('LIKE')} className={`flex items-center gap-1.5 transition-colors ${votes.userVote === 'LIKE' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}>
          <ThumbsUp size={24} weight={votes.userVote === 'LIKE' ? "fill" : "regular"} />
          {votes.likes > 0 && <span className="text-sm font-bold">{votes.likes}</span>}
        </button>
        <div className="w-[1px] h-6 bg-white/10" />
        <button onClick={() => onVote('DISLIKE')} className={`flex items-center gap-1.5 transition-colors ${votes.userVote === 'DISLIKE' ? 'text-red-400' : 'text-zinc-400 hover:text-white'}`}>
          <ThumbsDown size={24} weight={votes.userVote === 'DISLIKE' ? "fill" : "regular"} />
          {(votes.userVote === 'DISLIKE' && votes.dislikes > 0) && <span className="text-sm font-bold">{votes.dislikes}</span>}
        </button>
      </div>

      <button onClick={onShare} className="p-3 rounded-2xl transition-all text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 shadow-[0_4px_20px_rgba(37,211,102,0.15)]">
        <WhatsappLogo size={24} weight="fill" />
      </button>
    </div>
  );
}

interface ProductCommentsSectionProps {
  comments: any[];
  user: any;
  newComment: string;
  isSubmitting: boolean;
  commentsRef: React.RefObject<HTMLDivElement | null>;
  onCommentChange: (val: string) => void;
  onPostComment: (e: React.FormEvent) => void;
}

function ProductCommentsSection({
  comments,
  user,
  newComment,
  isSubmitting,
  commentsRef,
  onCommentChange,
  onPostComment,
}: ProductCommentsSectionProps) {
  return (
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
      
      <form onSubmit={onPostComment} className="flex gap-3 mb-10">
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
            onChange={e => onCommentChange(e.target.value)}
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
                  {formatShortDate(comment.createdAt)}
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
  );
}

interface RelatedProductsSectionProps {
  relatedProducts: any[];
  visibleCount: number;
  onSelectProduct: (relItem: any) => void;
  onLoadMore: () => void;
}

function RelatedProductsSection({
  relatedProducts,
  visibleCount,
  onSelectProduct,
  onLoadMore,
}: RelatedProductsSectionProps) {
  if (relatedProducts.length === 0) return null;

  return (
    <div className="mt-12 glass-3d-card rounded-[2.5rem] p-6 sm:p-10">
      <h4 className="text-xl md:text-2xl font-bold text-white mb-6">Ofertas Relacionadas</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {relatedProducts.slice(0, visibleCount).map((relItem) => (
          <button 
            key={relItem.id}
            onClick={() => onSelectProduct(relItem)}
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
                {relItem.price > 0 ? formatBrl(relItem.price) : 'Ver Oferta'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {visibleCount < relatedProducts.length && (
        <div className="flex justify-center mt-2">
          <button
            onClick={onLoadMore}
            className="text-white border border-white/10 hover:bg-white/5 font-semibold text-sm py-3 px-8 rounded-xl transition-all"
          >
            Ver mais ofertas ({relatedProducts.length - visibleCount})
          </button>
        </div>
      )}
    </div>
  );
}

