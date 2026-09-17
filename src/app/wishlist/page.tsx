"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { 
  Heart, 
  Trash, 
  ArrowRight, 
  ShoppingBag, 
  Tag, 
  Sparkle,
  ArrowSquareOut
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WishlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function loadWishlist() {
      setLoading(true);
      try {
        if (user) {
          // Usuário logado: busca do backend
          const res = await fetch("/api/favorites");
          const data = await res.json();
          if (data.favorites && Array.isArray(data.favorites)) {
            setItems(data.favorites.map((f: any) => f.product).filter(Boolean));
          }
        } else {
          // Visitante: lê os IDs salvos no localStorage
          const stored = localStorage.getItem("economizei_favorites");
          const ids: string[] = stored ? JSON.parse(stored) : [];

          if (ids.length > 0) {
            // Busca produtos pelos IDs
            const res = await fetch(`/api/products?limit=50`);
            const data = await res.json();
            if (data.products && Array.isArray(data.products)) {
              const matched = data.products.filter((p: any) => ids.includes(p.id));
              setItems(matched);
            }
          } else {
            setItems([]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar favoritos:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadWishlist();
    }
  }, [user, authLoading]);

  async function handleRemove(productId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== productId));

    // Remove do localStorage
    try {
      const stored = localStorage.getItem("economizei_favorites");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const nextIds = ids.filter(id => id !== productId);
        localStorage.setItem("economizei_favorites", JSON.stringify(nextIds));
        window.dispatchEvent(new CustomEvent("favorites-updated", { detail: { count: nextIds.length } }));
      }
    } catch {}

    // Se logado, remove do servidor
    if (user) {
      try {
        await fetch(`/api/favorites?productId=${productId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Erro ao remover favorito:", err);
      }
    }
  }

  const formatCurrency = (val?: number | null) => {
    if (!val || val <= 0) return "Consultar loja";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen text-white pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto">
          {/* Header da Página */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                  <Heart size={28} weight="fill" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    Minha Lista de Desejos
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Acompanhe o preço das suas ofertas favoritas e receba notificações
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!user && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Sparkle size={16} weight="fill" />
                  Faça login para sincronizar em outros dispositivos
                </button>
              )}
              <span className="text-sm font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-zinc-300">
                {items.length} {items.length === 1 ? "produto salvo" : "produtos salvos"}
              </span>
            </div>
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="glass-3d-card rounded-2xl sm:rounded-3xl p-3 sm:p-5 aspect-[3/4] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center glass-3d-card rounded-[2.5rem] border border-white/5 max-w-lg mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6">
                <Heart size={40} weight="duotone" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Sua lista de desejos está vazia
              </h2>
              <p className="text-sm text-zinc-400 mb-8 max-w-sm">
                Explore as melhores promoções e clique no ícone de coração para salvar produtos aqui e monitorar quedas de preço!
              </p>
              <Link
                href="/"
                className="btn-3d flex items-center gap-2 font-bold text-sm px-8 py-3.5 rounded-2xl"
              >
                <ShoppingBag size={18} weight="bold" />
                Explorar Ofertas
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
              <AnimatePresence>
                {items.map((product) => {
                  const discount = product.originalPrice && product.price && product.originalPrice > product.price
                    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => router.push(`/produto/${product.shortId || product.id}`)}
                      className="group cursor-pointer glass-3d-card rounded-2xl sm:rounded-[2rem] overflow-hidden flex flex-col border border-white/5 hover:border-accent/40 transition-all shadow-xl hover:shadow-2xl"
                    >
                      {/* Top Image */}
                      <div className="relative aspect-square bg-white p-3 sm:p-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }}
                        />
                        {discount > 0 && (
                          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-600 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                            <Tag size={11} weight="fill" />
                            -{discount}%
                          </span>
                        )}

                        <button
                          onClick={(e) => handleRemove(product.id, e)}
                          title="Remover dos favoritos"
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-md z-10"
                        >
                          <Trash size={14} weight="bold" />
                        </button>
                      </div>

                      {/* Info Body */}
                      <div className="p-3 sm:p-5 flex flex-col flex-1">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 truncate">
                          {product.category || "Oferta"}
                        </span>
                        <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 line-clamp-2 mb-2 sm:mb-4 group-hover:text-white transition-colors leading-snug">
                          {product.name}
                        </h3>

                        <div className="mt-auto pt-2 sm:pt-3 border-t border-white/5 flex items-end justify-between">
                          <div>
                            <div className="text-sm sm:text-lg font-black text-white leading-tight">
                              {formatCurrency(product.price)}
                            </div>
                            {discount > 0 && (
                              <span className="text-[10px] sm:text-xs text-zinc-500 line-through">
                                {formatCurrency(product.originalPrice)}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] sm:text-xs font-bold text-accent group-hover:translate-x-1 transition-transform flex items-center gap-0.5 sm:gap-1">
                            Ver <ArrowRight size={12} weight="bold" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AuthPanel isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
