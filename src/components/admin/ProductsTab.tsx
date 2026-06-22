"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, Pencil, Trash, GridFour, ListDashes, ArrowSquareOut, Check, SortAscending, X, CheckCircle, Warning
} from "@phosphor-icons/react";
import { ProductModal } from "./ProductModal";
import { ProductsGridSkeleton } from "./SkeletonLoader";

type Product = {
  id: string;
  name: string;
  category: string;
  platformProductId?: string | null;
  imageUrl: string;
  price?: number;
  status?: string;
  isFixed?: boolean;
  brand?: string;
  createdAt?: string;
  links?: {
    amazon?: string;
    mercadoLivre?: string;
    shopee?: string;
    aliexpress?: string;
    tiktok?: string;
  };
  productLinks?: {
    platform: string;
    sourceUrl: string | null;
    affiliateUrl: string | null;
    generatedAffiliateUrl: string | null;
  }[];
  images?: {
    id: string;
    url: string;
    isPrimary: boolean;
  }[];
};

type StatusFilter = "all" | "active" | "pending" | "fixed" | "notFixed";
type SortMode = "date_desc" | "date_asc" | "alpha_asc" | "alpha_desc" | "price_asc" | "price_desc";
type LayoutMode = "grid" | "list";

// ─── ImageGalleryOverlay ───────────────────────────────────────────────────────
function ImageGalleryOverlay({
  product,
  onClose,
  onSelectPrimary
}: {
  product: Product;
  onClose: () => void;
  onSelectPrimary: (url: string) => void;
}) {
  // Coleta todas as imagens exclusivas
  const allImages = useMemo(() => {
    const urls = new Set<string>();
    urls.add(product.imageUrl);
    if (product.images) {
      product.images.forEach(img => urls.add(img.url));
    }
    return Array.from(urls);
  }, [product]);

  const [mainImage, setMainImage] = useState(product.imageUrl);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col p-4" onClick={onClose}>
      <button
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-zinc-800/80 rounded-full p-2 z-10"
        onClick={onClose}
      >
        <X size={22} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative" onClick={(e) => e.stopPropagation()}>
        {/* Imagem Principal */}
        <div className="relative max-h-[70vh] flex items-center justify-center">
          <img
            src={mainImage}
            alt="Preview Principal"
            className="max-w-[90vw] max-h-[70vh] object-contain rounded-xl shadow-2xl border border-zinc-700/50"
          />
          {mainImage !== product.imageUrl && (
            <button
              onClick={() => {
                onSelectPrimary(mainImage);
                onClose();
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-lg font-bold shadow-xl transition-transform hover:scale-105"
            >
              Usar esta foto
            </button>
          )}
        </div>

        {/* Galeria de Miniaturas */}
        {allImages.length > 1 && (
          <div className="mt-6 flex gap-3 overflow-x-auto max-w-[90vw] pb-4 px-2 custom-scrollbar">
            {allImages.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(url)}
                className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  mainImage === url ? 'border-accent scale-105 shadow-lg' : 'border-zinc-700/50 hover:border-zinc-500 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                {url === product.imageUrl && (
                  <div className="absolute top-1 left-1 bg-accent text-black p-0.5 rounded-full shadow" title="Imagem Atual">
                    <CheckCircle size={12} weight="fill" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProductsTab ───────────────────────────────────────────────────────────────
export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");
  
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => { 
    fetchProducts(); 
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products?status=all");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    }
  }

  // Auto-Save Inline (PATCH /api/admin/products/[id])
  async function handleAutoSave(id: string, field: keyof Product, value: any) {
    const trackingKey = `${id}-${field}`;
    setSavingFields(prev => ({ ...prev, [trackingKey]: true }));
    
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      
      if (!res.ok) {
        throw new Error("Erro no auto-save");
      }
    } catch (error) {
      alert(`Erro ao salvar ${field}. Recarregue a página.`);
      fetchProducts(); // Reverte update otimista se falhar
    } finally {
      setSavingFields(prev => {
        const next = { ...prev };
        delete next[trackingKey];
        return next;
      });
    }
  }

  async function handleQuickApprove(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "active" } : p)));
      } else {
        alert("Erro ao aprovar produto");
      }
    } catch (error) {
      alert("Erro ao aprovar produto");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = products.filter((p) => {
      if (statusFilter === "active") return p.status === "active" || p.status === "approved";
      if (statusFilter === "pending") return p.status === "pending";
      if (statusFilter === "fixed") return p.isFixed === true;
      if (statusFilter === "notFixed") return !p.isFixed;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case "alpha_asc": return a.name.localeCompare(b.name, "pt-BR");
        case "alpha_desc": return b.name.localeCompare(a.name, "pt-BR");
        case "price_asc": return (a.price ?? Infinity) - (b.price ?? Infinity);
        case "price_desc": return (b.price ?? -Infinity) - (a.price ?? -Infinity);
        case "date_asc": return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        case "date_desc":
        default: return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }
    });

    return result;
  }, [products, statusFilter, sortMode]);

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Gerenciar Produtos</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus size={18} weight="bold" />
          Adicionar Produto
        </button>
      </div>

      {/* ─── Filtros de Status ───────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 border-b border-zinc-800 pb-4 overflow-x-auto">
        {(["all", "active", "pending", "fixed", "notFixed"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              statusFilter === filter
                ? "bg-zinc-800 text-accent border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {filter === "all" && `Todos (${products.length})`}
            {filter === "active" && `Ativos (${products.filter(p => p.status === "active" || p.status === "approved").length})`}
            {filter === "pending" && `Pendentes (${products.filter(p => p.status === "pending").length})`}
            {filter === "fixed" && `🔒 Com Trava (${products.filter(p => p.isFixed).length})`}
            {filter === "notFixed" && `🔓 Sem Trava (${products.filter(p => !p.isFixed).length})`}
          </button>
        ))}
      </div>

      {/* ─── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2">
          <SortAscending size={16} className="text-zinc-400 shrink-0" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="date_desc">📅 Mais Recentes</option>
            <option value="date_asc">📅 Mais Antigos</option>
            <option value="alpha_asc">🔤 A → Z</option>
            <option value="alpha_desc">🔤 Z → A</option>
            <option value="price_asc">💰 Menor Preço</option>
            <option value="price_desc">💰 Maior Preço</option>
          </select>
          <span className="text-xs text-zinc-500 ml-1">
            {filteredAndSorted.length} produto{filteredAndSorted.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setLayoutMode("list")}
            title="Modo Lista"
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === "list" ? "bg-zinc-700 text-accent" : "text-zinc-500 hover:text-white"
            }`}
          >
            <ListDashes size={18} />
          </button>
          <button
            onClick={() => setLayoutMode("grid")}
            title="Modo Grade"
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === "grid" ? "bg-zinc-700 text-accent" : "text-zinc-500 hover:text-white"
            }`}
          >
            <GridFour size={18} />
          </button>
        </div>
      </div>

      {/* ─── Conteúdo ───────────────────────────────────────────────────── */}
      {loading ? (
        <ProductsGridSkeleton />
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          Nenhum produto encontrado.
        </div>
      ) : layoutMode === "list" ? (
        // ═══════════════════════════════════════════
        //  MODO LISTA (Edição Inline)
        // ═══════════════════════════════════════════
        <div className="flex flex-col gap-3">
          {filteredAndSorted.map((product) => {
            const isPending = product.status === "pending";
            const isActive = product.status === "active" || product.status === "approved";
            
            // Lógica para separar Link da Loja vs Link Afiliado
            let sourceUrl = "";
            let affiliateUrl = "";
            
            if (product.productLinks && product.productLinks.length > 0) {
              const mainPlat = product.productLinks[0];
              sourceUrl = mainPlat.sourceUrl || "";
              affiliateUrl = mainPlat.generatedAffiliateUrl || mainPlat.affiliateUrl || "";
            } else if (product.links) {
              // Legacy
              const legacyPlat = ['amazon','mercadoLivre','shopee','aliexpress','tiktok'].find(p => (product.links as any)[p]);
              if (legacyPlat) {
                sourceUrl = (product.links as any)[legacyPlat] || "";
                affiliateUrl = (product.links as any)[legacyPlat] || ""; // Legacy doesn't split
              }
            }

            const hasAffiliate = affiliateUrl && affiliateUrl !== sourceUrl;

            return (
              <div
                key={product.id}
                className={`flex flex-col lg:flex-row gap-4 p-4 rounded-xl border transition-colors ${
                  isPending ? "bg-amber-950/10 border-amber-900/20 hover:border-amber-800/40"
                            : "bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/70"
                }`}
              >
                {/* 1. Imagem e Info Principal (Esquerda) */}
                <div className="flex gap-4 lg:w-1/3 shrink-0">
                  <button
                    onClick={() => setGalleryProduct(product)}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border border-zinc-700 hover:border-accent transition-colors relative group"
                    title="Ver todas as fotos"
                  >
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      {(product.images?.length || 0) + 1} 📸
                    </div>
                  </button>
                  
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 leading-tight line-clamp-2" title={product.name}>
                      {product.name}
                    </div>
                    {product.price && (
                      <div className="text-xs font-bold text-emerald-400">R$ {product.price.toFixed(2)}</div>
                    )}
                    <div className="relative">
                      <select
                        value={product.category}
                        onChange={(e) => handleAutoSave(product.id, 'category', e.target.value)}
                        className={`text-xs bg-zinc-800 border rounded px-2 py-1 w-full text-zinc-300 focus:border-accent outline-none ${
                          savingFields[`${product.id}-category`] ? "border-accent/50 opacity-70" : "border-zinc-700"
                        }`}
                      >
                        <option value="">Sem categoria...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        {!categories.includes(product.category) && <option value={product.category}>{product.category}</option>}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Links Completos (Centro) */}
                <div className="flex flex-col gap-2 lg:w-1/3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-zinc-500 w-[70px] shrink-0 font-medium tracking-wide">Loja:</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={sourceUrl} 
                      className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-xs text-zinc-400 outline-none truncate hover:bg-zinc-800 transition-colors" 
                      placeholder="Sem link original"
                      title={sourceUrl}
                    />
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded">
                        <ArrowSquareOut size={14} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-zinc-500 w-[70px] shrink-0 font-medium tracking-wide">Afiliado:</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={affiliateUrl} 
                      className={`flex-1 bg-zinc-800/50 border rounded px-2 py-1 text-xs outline-none truncate hover:bg-zinc-800 transition-colors ${
                        !hasAffiliate && sourceUrl ? "border-red-900/50 text-red-400" : "border-zinc-700/50 text-emerald-400/80"
                      }`} 
                      placeholder="Sem link de afiliado"
                      title={affiliateUrl}
                    />
                    {affiliateUrl && (
                      <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded">
                        <ArrowSquareOut size={14} />
                      </a>
                    )}
                  </div>
                  {!hasAffiliate && sourceUrl && (
                    <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/30 px-2 py-0.5 rounded w-max border border-red-900/30">
                      <Warning size={12} /> Link de afiliado pendente ou igual ao original
                    </div>
                  )}
                </div>

                {/* 3. Atributos Secundários e Trava (Direita) */}
                <div className="flex flex-col gap-2 lg:flex-1 shrink-0">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Marca"
                      value={product.brand || ''}
                      onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, brand: e.target.value} : p))}
                      onBlur={(e) => handleAutoSave(product.id, 'brand', e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-accent"
                    />
                    <input 
                      type="text" 
                      placeholder="ID Plataforma"
                      value={product.platformProductId || ''}
                      onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, platformProductId: e.target.value} : p))}
                      onBlur={(e) => handleAutoSave(product.id, 'platformProductId', e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={!!product.isFixed} 
                        onChange={(e) => handleAutoSave(product.id, 'isFixed', e.target.checked)}
                        className="w-3.5 h-3.5 accent-accent rounded"
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">Travar Repostagem</span>
                    </label>

                    {/* Ações */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPending && (
                        <button
                          onClick={() => handleQuickApprove(product.id)}
                          disabled={approvingId === product.id}
                          title="Aprovar sem enviar pro telegram"
                          className="flex items-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          {approvingId === product.id ? <span className="animate-pulse">...</span> : <Check size={14} weight="bold" />}
                          <span className="hidden xl:inline">Aprovar</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                        title="Abrir Modal Completo"
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-lg text-zinc-300 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        title="Deletar produto"
                        className="p-1.5 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        // ═══════════════════════════════════════════
        //  MODO GRADE (Legado)
        // ═══════════════════════════════════════════
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="aspect-[4/5] relative bg-white flex items-center justify-center shrink-0">
                <img
                  src={product.imageUrl} alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-4 cursor-zoom-in"
                  onClick={() => setGalleryProduct(product)}
                />
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-lg backdrop-blur-md ${
                    product.status === "active" || product.status === "approved" ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                    : product.status === "pending" ? "bg-amber-950/80 text-amber-400 border-amber-800/80"
                    : "bg-zinc-800/80 text-zinc-400 border-zinc-700/80"
                  }`}>
                    {product.status === "active" || product.status === "approved" ? "Ativo" : "Pendente"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-accent font-mono uppercase truncate">{product.category}</div>
                <h3 className="text-lg font-semibold mt-1 line-clamp-2 min-h-[56px]">{product.name}</h3>
                {product.price && <p className="text-zinc-400 mt-1 font-medium">R$ {product.price.toFixed(2)}</p>}
                
                <div className="flex gap-2 mt-4">
                  {product.status === "pending" && (
                    <button onClick={() => handleQuickApprove(product.id)} className="flex items-center justify-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 px-3 py-2 rounded-lg transition-colors">
                      <Check size={16} weight="bold" />
                    </button>
                  )}
                  <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="flex-1 flex justify-center items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm">
                    <Pencil size={16} /> Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Overlays ──────────────────────────────────────────────────────── */}
      {galleryProduct && (
        <ImageGalleryOverlay
          product={galleryProduct}
          onClose={() => setGalleryProduct(null)}
          onSelectPrimary={(url) => handleAutoSave(galleryProduct.id, 'imageUrl', url)}
        />
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); fetchProducts(); }}
        product={editingProduct}
      />
    </div>
  );
}
