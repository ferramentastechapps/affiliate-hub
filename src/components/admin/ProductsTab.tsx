"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Pencil, Trash, GridFour, ListDashes, ArrowSquareOut, Check, SortAscending, X, CheckCircle, Warning, CopySimple, Camera, UploadSimple, Image as ImageIcon, Sparkle, ArrowsLeftRight
} from "@phosphor-icons/react";
import { ProductModal } from "./ProductModal";
import { ProductsGridSkeleton } from "./SkeletonLoader";

type Product = {
  id: string;
  shortId?: number;
  name: string;
  category: string;
  platformProductId?: string | null;
  platformId?: string | null;
  platformType?: string | null;
  externalId?: string | null;
  source?: string | null;
  imageUrl: string;
  enhancedImageUrl?: string | null;
  price?: number;
  status?: string;
  isFixed?: boolean;
  brand?: string;
  createdAt?: string;
  dropPercent?: number; // FASE 2
  lowestPrice30d?: number; // FASE 2
  highestPrice30d?: number; // FASE 2
  // FASE 4 - Recomendações
  totalScore?: number;
  scoreBreakdown?: {
    discountScore: number;
    priceDropScore: number;
    aiScore: number;
    freshnessScore: number;
  };
  neverPosted?: boolean;
  lastPostDate?: string | null;
  daysSinceLastPost?: number | null;
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
  _localSourceUrl?: string;
  _localAffiliateUrl?: string;
};

type StatusFilter = "all" | "active" | "pending" | "duplicates" | "no-lifestyle" | "best-to-post" | "price-drops" | "fixed" | "notFixed";
type SortMode = "number_asc" | "number_desc" | "alpha_asc" | "alpha_desc" | "duplicates" | "date_desc" | "date_asc" | "price_asc" | "price_desc";
type LayoutMode = "grid" | "list";

// ─── Funções Utilitárias para Normalização e Duplicados ────────────────────────
function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ")   // remove pontuação
    .replace(/\s+/g, " ")           // espaços únicos
    .trim();
}

function getProductDuplicateKey(p: Product): string {
  if (p.platformProductId && p.platformProductId.trim().length > 3) {
    return `id_${p.platformProductId.trim().toLowerCase()}`;
  }
  const norm = normalizeText(p.name);
  const words = norm.split(" ").filter(w => w.length > 2).slice(0, 5).join(" ");
  return words || norm.slice(0, 35);
}

// ─── ImageGalleryOverlay ───────────────────────────────────────────────────────
function ImageGalleryOverlay({
  product,
  onClose,
  onSelectPrimary,
  onSelectLifestyle
}: {
  product: Product;
  onClose: () => void;
  onSelectPrimary: (url: string) => void;
  onSelectLifestyle?: (url: string) => void;
}) {
  const allImages = useMemo(() => {
    const urls = new Set<string>();
    if (product.imageUrl) urls.add(product.imageUrl);
    if (product.enhancedImageUrl) urls.add(product.enhancedImageUrl);
    if (product.images) {
      product.images.forEach(img => urls.add(img.url));
    }
    return Array.from(urls);
  }, [product]);

  const [mainImage, setMainImage] = useState(product.enhancedImageUrl || product.imageUrl);

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
        <div className="relative max-h-[65vh] flex items-center justify-center">
          <img
            src={mainImage}
            alt="Preview Principal"
            className="max-w-[90vw] max-h-[65vh] object-contain rounded-xl shadow-2xl border border-zinc-700/50"
          />
        </div>

        {/* Botões de Ação para a Foto Selecionada */}
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <button
            onClick={() => {
              onSelectPrimary(mainImage);
              onClose();
            }}
            className={`px-4 py-2 rounded-lg font-bold shadow-xl transition-transform hover:scale-105 text-xs flex items-center gap-2 ${
              mainImage === product.imageUrl 
                ? "bg-emerald-600 text-white" 
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            <Check size={14} weight="bold" />
            {mainImage === product.imageUrl ? "Foto do Site Atual" : "Definir Foto do Site (Branco)"}
          </button>

          {onSelectLifestyle && (
            <button
              onClick={() => {
                onSelectLifestyle(mainImage);
                onClose();
              }}
              className={`px-4 py-2 rounded-lg font-bold shadow-xl transition-transform hover:scale-105 text-xs flex items-center gap-2 ${
                mainImage === product.enhancedImageUrl 
                  ? "bg-indigo-600 text-white" 
                  : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
              }`}
            >
              <Camera size={14} weight="bold" />
              {mainImage === product.enhancedImageUrl ? "Foto Lifestyle Atual" : "Definir Foto Lifestyle (Grupo)"}
            </button>
          )}
        </div>

        {/* Galeria de Miniaturas */}
        {allImages.length > 1 && (
          <div className="mt-5 flex gap-3 overflow-x-auto max-w-[90vw] pb-2 px-2 custom-scrollbar">
            {allImages.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(url)}
                className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  mainImage === url ? 'border-accent scale-105 shadow-lg' : 'border-zinc-700/50 hover:border-zinc-500 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                {url === product.imageUrl && (
                  <div className="absolute top-1 left-1 bg-emerald-500 text-black text-[8px] font-bold px-1 rounded shadow" title="Foto do Site">
                    Site
                  </div>
                )}
                {url === product.enhancedImageUrl && (
                  <div className="absolute bottom-1 right-1 bg-indigo-500 text-white text-[8px] font-bold px-1 rounded shadow" title="Foto Lifestyle">
                    Life
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

// ─── CopyableId ───────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  amazon:       { label: 'AMAZON',  color: 'text-orange-400 border-orange-800/50 bg-orange-950/30' },
  mercadolivre: { label: 'ML',      color: 'text-yellow-400 border-yellow-800/50 bg-yellow-950/30' },
  mercadoLivre: { label: 'ML',      color: 'text-yellow-400 border-yellow-800/50 bg-yellow-950/30' },
  shopee:       { label: 'SHOPEE',  color: 'text-orange-300 border-orange-800/50 bg-orange-950/20' },
  aliexpress:   { label: 'ALI',     color: 'text-red-400 border-red-800/50 bg-red-950/30' },
  magalu:       { label: 'MAGALU',  color: 'text-blue-400 border-blue-800/50 bg-blue-950/30' },
  kabum:        { label: 'KABUM',   color: 'text-blue-300 border-blue-800/50 bg-blue-950/20' },
  netshoes:     { label: 'NETSHOES',color: 'text-purple-400 border-purple-800/50 bg-purple-950/30' },
};

function CopyableId({ product }: { product: Product }) {
  const [copied, setCopied] = useState(false);

  const nativeId = product.platformProductId || product.externalId;
  const displayId = product.shortId ? `#${product.shortId}` : (nativeId || product.id.slice(0, 8).toUpperCase());
  const copyValue = nativeId || (product.shortId ? String(product.shortId) : product.id);

  const sourceInfo = product.source ? (SOURCE_LABELS[product.source] ?? null) : null;
  const hasNativeId = !!nativeId;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(copyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copiar: ${copyValue}`}
      className="flex items-center gap-1 w-fit group"
    >
      {sourceInfo && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sourceInfo.color} tracking-wider`}>
          {sourceInfo.label}
        </span>
      )}
      <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
        product.shortId 
          ? 'text-amber-300 bg-amber-950/40 border-amber-800/60 group-hover:border-amber-500'
          : hasNativeId
            ? 'text-zinc-300 bg-zinc-800/80 border-zinc-700/50 group-hover:border-zinc-500'
            : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/30 group-hover:border-zinc-600'
      }`}>
        {displayId}
      </span>
      {copied
        ? <CheckCircle size={11} weight="fill" className="text-emerald-400 shrink-0" />
        : <CopySimple size={11} className="text-zinc-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      }
      {copied && <span className="text-[10px] text-emerald-400 font-bold">copiado!</span>}
    </button>
  );
}

// ─── ProductsTab ───────────────────────────────────────────────────────────────
export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [noAffiliateLinkFilter, setNoAffiliateLinkFilter] = useState<boolean>(false);
  const [noLifestyleFilter, setNoLifestyleFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [uploadingLifestyleId, setUploadingLifestyleId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [postingToTelegram, setPostingToTelegram] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { 
    fetchProducts(); 
    fetchCategories();
  }, [statusFilter]);

  async function fetchProducts() {
    try {
      setLoading(true);
      let endpoint = '/api/products?status=all';
      
      if (statusFilter === 'price-drops') {
        endpoint = '/api/products?filter=price-drops';
      } else if (statusFilter === 'best-to-post') {
        endpoint = '/api/admin/products/best-to-post';
      }
      
      const res = await fetch(endpoint);
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
  async function handleAutoSave(id: string, field: keyof Product | 'updateSourceUrl' | 'updateAffiliateUrl', value: any) {
    const trackingKey = `${id}-${field}`;
    setSavingFields(prev => ({ ...prev, [trackingKey]: true }));
    
    // Optimistic update
    if (field !== 'updateSourceUrl' && field !== 'updateAffiliateUrl') {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    }

    try {
      const product = products.find(p => p.id === id);
      const platform = product?.productLinks?.[0]?.platform || 
                       ['amazon','mercadoLivre','shopee','aliexpress','tiktok'].find(p => product?.links?.[p as keyof typeof product.links]) || 
                       product?.source || 
                       'amazon';

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value, platform }),
      });
      
      if (!res.ok) {
        throw new Error("Erro no auto-save");
      }
    } catch (error) {
      alert(`Erro ao salvar ${field}. Recarregue a página.`);
      fetchProducts();
    } finally {
      setSavingFields(prev => {
        const next = { ...prev };
        delete next[trackingKey];
        return next;
      });
    }
  }

  // Upload Rápido de Foto Lifestyle direto da linha
  async function handleQuickLifestyleUpload(productId: string, file: File) {
    if (!file) return;
    setUploadingLifestyleId(productId);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });
      if (!res.ok) throw new Error('Falha no upload');
      const json = await res.json();
      if (json.imageUrl) {
        await handleAutoSave(productId, 'enhancedImageUrl', json.imageUrl);
      }
    } catch (err) {
      alert('Erro ao enviar imagem lifestyle');
    } finally {
      setUploadingLifestyleId(null);
    }
  }

  // Estatísticas e Mapa de Duplicados
  const duplicateStats = useMemo(() => {
    const countMap = new Map<string, number>();
    const productKeyMap = new Map<string, string>();

    products.forEach(p => {
      const key = getProductDuplicateKey(p);
      productKeyMap.set(p.id, key);
      if (key) {
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    });

    const duplicateProductIds = new Set<string>();
    let totalDuplicates = 0;

    products.forEach(p => {
      const key = productKeyMap.get(p.id);
      if (key && (countMap.get(key) || 0) > 1) {
        duplicateProductIds.add(p.id);
        totalDuplicates++;
      }
    });

    const noLifestyleCount = products.filter(p => !p.enhancedImageUrl || p.enhancedImageUrl === p.imageUrl).length;

    return { countMap, productKeyMap, duplicateProductIds, totalDuplicates, noLifestyleCount };
  }, [products]);

  async function handleQuickApprove(id: string) {
    try {
      setApprovingId(id);
      const res = await fetch(`/api/webhook/products/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id })
      });
      if (!res.ok) throw new Error("Erro ao aprovar");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: "active" } : p));
    } catch (err) {
      console.error(err);
      alert("Falha ao aprovar produto rapidamente");
    } finally {
      setApprovingId(null);
    }
  }

  async function handlePostToTelegram(productId: string) {
    try {
      setPostingToTelegram(productId);
      const res = await fetch(`/api/admin/queues/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao postar no Telegram");
      alert("✅ Produto enviado para publicação no Telegram!");
      fetchProducts();
    } catch (error: any) {
      console.error("Erro ao postar no Telegram:", error);
      alert(`❌ ${error.message || "Erro ao postar no Telegram"}`);
    } finally {
      setPostingToTelegram(null);
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
      // 1. Status Filter
      if (statusFilter === "active" && p.status !== "active" && p.status !== "approved") return false;
      if (statusFilter === "pending" && p.status !== "pending") return false;
      if (statusFilter === "fixed" && !p.isFixed) return false;
      if (statusFilter === "notFixed" && p.isFixed) return false;
      if (statusFilter === "duplicates" && !duplicateStats.duplicateProductIds.has(p.id)) return false;
      if (statusFilter === "no-lifestyle" && (p.enhancedImageUrl && p.enhancedImageUrl !== p.imageUrl)) return false;

      // 2. Category Filter
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

      // 3. Store Filter
      if (storeFilter !== "all") {
        const pStore = (p.source || p.platformType || (p as any).storeName || "").toLowerCase();
        if (!pStore.includes(storeFilter.toLowerCase())) return false;
      }

      // 4. No Affiliate Link Filter
      if (noAffiliateLinkFilter) {
        const hasPlatformLink = p.productLinks?.some(link => link.affiliateUrl || link.generatedAffiliateUrl);
        const hasOldLink = Object.values(p.links || {}).some(url => url && typeof url === 'string');
        const hasLocalLink = !!p._localAffiliateUrl;
        if (hasPlatformLink || hasOldLink || hasLocalLink) return false;
      }

      // 5. No Lifestyle Filter (Toggle Toolbar)
      if (noLifestyleFilter && p.enhancedImageUrl && p.enhancedImageUrl !== p.imageUrl) {
        return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = normalizeText(searchQuery);
        const matchesName = normalizeText(p.name).includes(q);
        const matchesId = (p.shortId ? String(p.shortId) : "").includes(q) || (p.platformProductId || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchesBrand = normalizeText(p.brand || "").includes(q);
        if (!matchesName && !matchesId && !matchesBrand) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case "number_asc": {
          const numA = a.shortId ?? 99999999;
          const numB = b.shortId ?? 99999999;
          return numA - numB;
        }
        case "number_desc": {
          const numA = a.shortId ?? -1;
          const numB = b.shortId ?? -1;
          return numB - numA;
        }
        case "alpha_asc": {
          return normalizeText(a.name).localeCompare(normalizeText(b.name), "pt-BR");
        }
        case "alpha_desc": {
          return normalizeText(b.name).localeCompare(normalizeText(a.name), "pt-BR");
        }
        case "duplicates": {
          const isDupA = duplicateStats.duplicateProductIds.has(a.id);
          const isDupB = duplicateStats.duplicateProductIds.has(b.id);
          if (isDupA !== isDupB) return isDupA ? -1 : 1;
          const keyA = duplicateStats.productKeyMap.get(a.id) || '';
          const keyB = duplicateStats.productKeyMap.get(b.id) || '';
          if (keyA !== keyB) return keyA.localeCompare(keyB, "pt-BR");
          return normalizeText(a.name).localeCompare(normalizeText(b.name), "pt-BR");
        }
        case "price_asc": return (a.price ?? Infinity) - (b.price ?? Infinity);
        case "price_desc": return (b.price ?? -Infinity) - (a.price ?? -Infinity);
        case "date_asc": return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        case "date_desc":
        default: return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }
    });

    return result;
  }, [products, statusFilter, sortMode, categoryFilter, storeFilter, noAffiliateLinkFilter, noLifestyleFilter, searchQuery, duplicateStats]);

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Gerenciar Produtos</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Ordene por número, ordem alfabética, localize repetidos e gerencie fotos lifestyle.</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-black px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors text-sm shadow-lg"
        >
          <Plus size={18} weight="bold" />
          Adicionar Produto
        </button>
      </div>

      {/* ─── Filtros de Status & Categorias Especiais ────────────────────── */}
      <div className="flex gap-2 mb-4 border-b border-zinc-800 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {(["all", "active", "pending", "duplicates", "no-lifestyle", "best-to-post", "price-drops", "fixed", "notFixed"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === filter
                ? "bg-zinc-800 text-accent border border-zinc-700 shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {filter === "all" && `Todos (${products.length})`}
            {filter === "active" && `Ativos (${products.filter(p => p.status === "active" || p.status === "approved").length})`}
            {filter === "pending" && `Pendentes (${products.filter(p => p.status === "pending").length})`}
            {filter === "duplicates" && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Warning size={13} weight="fill" /> Repetidos ({duplicateStats.totalDuplicates})
              </span>
            )}
            {filter === "no-lifestyle" && (
              <span className="text-indigo-400 font-medium flex items-center gap-1">
                <Camera size={13} /> Sem Lifestyle ({duplicateStats.noLifestyleCount})
              </span>
            )}
            {filter === "best-to-post" && `🔥 Melhores`}
            {filter === "price-drops" && `📉 Quedas`}
            {filter === "fixed" && `🔒 Trava (${products.filter(p => p.isFixed).length})`}
            {filter === "notFixed" && `🔓 Sem Trava (${products.filter(p => !p.isFixed).length})`}
          </button>
        ))}
      </div>

      {/* ─── Toolbar com Ordenações Avançadas e Filtros ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-5 gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Select de Ordenação Principal */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1">
            <SortAscending size={15} className="text-accent shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-400">Ordenar:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-transparent text-xs font-bold text-zinc-100 focus:outline-none cursor-pointer pr-1"
            >
              <optgroup label="🔢 Por Número do Produto">
                <option value="number_asc" className="bg-zinc-900">🔢 Nº Produto (#1 → #999)</option>
                <option value="number_desc" className="bg-zinc-900">🔢 Nº Produto (#999 → #1)</option>
              </optgroup>
              <optgroup label="🔤 Ordem Alfabética">
                <option value="alpha_asc" className="bg-zinc-900">🔤 Nome (A → Z)</option>
                <option value="alpha_desc" className="bg-zinc-900">🔤 Nome (Z → A)</option>
              </optgroup>
              <optgroup label="⚠️ Repetidos & Especiais">
                <option value="duplicates" className="bg-zinc-900">⚠️ Agrupar Repetidos</option>
              </optgroup>
              <optgroup label="📅 Por Data">
                <option value="date_desc" className="bg-zinc-900">📅 Mais Recentes</option>
                <option value="date_asc" className="bg-zinc-900">📅 Mais Antigos</option>
              </optgroup>
              <optgroup label="💰 Por Preço">
                <option value="price_asc" className="bg-zinc-900">💰 Menor Preço</option>
                <option value="price_desc" className="bg-zinc-900">💰 Maior Preço</option>
              </optgroup>
            </select>
          </div>

          {/* Busca Rápida */}
          <input
            type="text"
            placeholder="Buscar por nome, #número ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-accent w-48 sm:w-60"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-white text-xs">
              Limpar
            </button>
          )}

          {/* Categorias */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">📁 Todas Categorias</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          {/* Lojas */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">🏪 Todas Lojas</option>
            {Array.from(new Set(products.map(p => (p.source || p.platformType || (p as any).storeName || "Outros")).filter(Boolean))).sort().map(s => (
              <option key={s as string} value={s as string}>{String(s).toUpperCase()}</option>
            ))}
          </select>
          
          {/* Toggle Sem Link */}
          <button
            onClick={() => setNoAffiliateLinkFilter(!noAffiliateLinkFilter)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 font-medium ${
              noAffiliateLinkFilter 
                ? "bg-red-900/50 border-red-500 text-red-300 shadow" 
                : "bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Mostrar apenas produtos sem link de afiliado"
          >
            <Warning size={13} />
            Sem Link
          </button>

          {/* Toggle Sem Lifestyle */}
          <button
            onClick={() => setNoLifestyleFilter(!noLifestyleFilter)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 font-medium ${
              noLifestyleFilter 
                ? "bg-indigo-900/50 border-indigo-500 text-indigo-300 shadow" 
                : "bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Mostrar apenas produtos sem foto de uso/lifestyle"
          >
            <Camera size={13} />
            Sem Lifestyle
          </button>

          <span className="text-xs text-zinc-400 font-semibold ml-1 hidden lg:inline">
            {filteredAndSorted.length} produto{filteredAndSorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Alternador de Layout */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setLayoutMode("list")}
            title="Modo Lista (Edição Rápida)"
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === "list" ? "bg-zinc-700 text-accent shadow" : "text-zinc-500 hover:text-white"
            }`}
          >
            <ListDashes size={18} />
          </button>
          <button
            onClick={() => setLayoutMode("grid")}
            title="Modo Grade"
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === "grid" ? "bg-zinc-700 text-accent shadow" : "text-zinc-500 hover:text-white"
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
        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-zinc-500">
          <p className="text-base font-semibold text-zinc-400">Nenhum produto encontrado com os filtros selecionados.</p>
          <p className="text-xs text-zinc-600 mt-1">Tente ajustar a busca, ordenação ou status.</p>
        </div>
      ) : statusFilter === "best-to-post" ? (
        // ═══════════════════════════════════════════
        //  MODO MELHORES PRA POSTAR (FASE 4)
        // ═══════════════════════════════════════════
        <div className="flex flex-col gap-4">
          {filteredAndSorted.map((product, index) => (
            <div
              key={product.id}
              className="bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-700/50 rounded-xl p-5 hover:border-accent/30 transition-all"
            >
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Ranking e Imagem */}
                <div className="flex gap-4 items-start w-full sm:w-auto sm:flex-shrink-0">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-base sm:text-lg border-2 ${
                      index === 0 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                      index === 1 ? 'bg-zinc-400/20 border-zinc-400 text-zinc-300' :
                      index === 2 ? 'bg-orange-700/20 border-orange-700 text-orange-500' :
                      'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl sm:text-2xl font-black text-accent">{product.totalScore?.toFixed(1)}</span>
                      <span className="text-[9px] text-zinc-500 font-medium">SCORE</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setGalleryProduct(product)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-zinc-700 hover:border-accent transition-colors"
                  >
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />
                  </button>
                </div>

                {/* Info do Produto */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <div>
                    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-2">
                      <h3 className="text-sm sm:text-base font-bold text-white flex-1 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {product.neverPosted ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                            ✅ Nunca postado
                          </span>
                        ) : product.daysSinceLastPost !== null && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            🔄 Postado há {product.daysSinceLastPost}d
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400 border border-zinc-700">
                        {product.category}
                      </span>
                      {product.price && (
                        <span className="px-2 py-1 bg-emerald-950/50 rounded text-emerald-400 border border-emerald-800 font-bold">
                          R$ {product.price.toFixed(2)}
                        </span>
                      )}
                      {duplicateStats.duplicateProductIds.has(product.id) && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1">
                          <Warning size={11} weight="fill" /> Repetido
                        </span>
                      )}
                      <CopyableId product={product} />
                    </div>
                  </div>

                  {/* Breakdown do Score */}
                  {product.scoreBreakdown && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">DESCONTO</div>
                        <div className="text-sm font-bold text-white">{product.scoreBreakdown.discountScore}/40</div>
                      </div>
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">QUEDA PREÇO</div>
                        <div className="text-sm font-bold text-white">{product.scoreBreakdown.priceDropScore}/30</div>
                      </div>
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">IA</div>
                        <div className="text-sm font-bold text-white">{product.scoreBreakdown.aiScore.toFixed(1)}/20</div>
                      </div>
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2">
                        <div className="text-[10px] text-zinc-500 mb-0.5">NOVIDADE</div>
                        <div className="text-sm font-bold text-white">{product.scoreBreakdown.freshnessScore}/10</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ação */}
                <div className="flex flex-col gap-2 items-stretch sm:items-end justify-between w-full sm:w-48 shrink-0">
                  <button
                    onClick={() => handlePostToTelegram(product.id)}
                    disabled={postingToTelegram === product.id}
                    className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black disabled:text-zinc-500 px-4 py-3 sm:py-2.5 rounded-lg font-bold transition-all hover:scale-105 disabled:scale-100"
                  >
                    {postingToTelegram === product.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                        Postando...
                      </>
                    ) : (
                      <>
                        📤 Postar no Telegram
                      </>
                    )}
                  </button>
                  
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                      className="flex-1 p-2.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors text-sm"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 p-2.5 sm:p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 rounded-lg transition-colors text-sm"
                    >
                      🗑️ Deletar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : layoutMode === "list" ? (
        // ═══════════════════════════════════════════
        //  MODO LISTA (Edição Inline Completa & Lifestyle)
        // ═══════════════════════════════════════════
        <div className="flex flex-col gap-2.5">
          {filteredAndSorted.map((product) => {
            const isPending = product.status === "pending";
            const isActive = product.status === "active" || product.status === "approved";
            const isDuplicate = duplicateStats.duplicateProductIds.has(product.id);
            const duplicateCount = duplicateStats.countMap.get(duplicateStats.productKeyMap.get(product.id) || '') || 1;
            const hasLifestyle = product.enhancedImageUrl && product.enhancedImageUrl !== product.imageUrl;
            
            // Lógica de Links
            let sourceUrl = "";
            let affiliateUrl = "";
            
            if (product.productLinks && product.productLinks.length > 0) {
              const mainPlat = product.productLinks[0];
              sourceUrl = mainPlat.sourceUrl || "";
              affiliateUrl = mainPlat.generatedAffiliateUrl || mainPlat.affiliateUrl || "";
            } else if (product.links) {
              const legacyPlat = ['amazon','mercadoLivre','shopee','aliexpress','tiktok'].find(p => (product.links as any)[p]);
              if (legacyPlat) {
                sourceUrl = (product.links as any)[legacyPlat] || "";
                affiliateUrl = (product.links as any)[legacyPlat] || "";
              }
            }

            if (product._localSourceUrl !== undefined) sourceUrl = product._localSourceUrl;
            if (product._localAffiliateUrl !== undefined) affiliateUrl = product._localAffiliateUrl;

            const hasAffiliate = affiliateUrl && affiliateUrl !== sourceUrl;

            return (
              <div
                key={product.id}
                className={`flex flex-col lg:flex-row gap-3 p-3.5 rounded-xl border transition-all ${
                  isDuplicate
                    ? "bg-amber-950/20 border-amber-800/40 shadow-sm"
                    : isPending 
                      ? "bg-amber-950/10 border-amber-900/20"
                      : "bg-zinc-900/70 border-zinc-800/60 hover:border-zinc-700/80"
                }`}
              >
                {/* ── Bloco das Fotos: Site (Fundo Branco) + Lifestyle (Grupo) ── */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Foto 1: Foto do Site */}
                  <div className="relative group">
                    <button
                      onClick={() => setGalleryProduct(product)}
                      className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border-2 border-emerald-500/40 hover:border-emerald-500 transition-colors shadow"
                      title="Foto do Site (Fundo Branco) - Clique para ver galeria"
                    >
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />
                    </button>
                    <span className="absolute -top-1.5 -left-1.5 bg-emerald-600 text-white font-bold text-[8px] px-1 py-0.2 rounded shadow uppercase tracking-wider">
                      Site
                    </span>
                  </div>

                  {/* Foto 2: Foto Lifestyle */}
                  <div className="relative group">
                    {hasLifestyle ? (
                      <div className="relative">
                        <button
                          onClick={() => setGalleryProduct(product)}
                          className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center shrink-0 border-2 border-indigo-500/60 hover:border-indigo-400 transition-colors shadow"
                          title="Foto Lifestyle do Grupo - Clique para gerenciar"
                        >
                          <img src={product.enhancedImageUrl!} alt="Lifestyle" className="w-full h-full object-cover" />
                        </button>
                        <span className="absolute -top-1.5 -left-1.5 bg-indigo-600 text-white font-bold text-[8px] px-1 py-0.2 rounded shadow uppercase tracking-wider flex items-center gap-0.5">
                          <Sparkle size={8} weight="fill" /> Life
                        </span>
                        {/* Botão de troca rápida */}
                        <label 
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold rounded-xl cursor-pointer transition-opacity"
                          title="Trocar Foto Lifestyle"
                        >
                          <UploadSimple size={14} weight="bold" />
                          <span>Trocar</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuickLifestyleUpload(product.id, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <label
                          className={`w-16 h-16 rounded-xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 flex flex-col items-center justify-center text-indigo-300 cursor-pointer transition-all shadow-sm ${
                            uploadingLifestyleId === product.id ? "opacity-50 animate-pulse" : ""
                          }`}
                          title="Clique para adicionar Foto Lifestyle (Upload direto)"
                        >
                          {uploadingLifestyleId === product.id ? (
                            <span className="text-[9px] font-bold text-center">Enviando...</span>
                          ) : (
                            <>
                              <Camera size={18} weight="bold" className="text-indigo-400" />
                              <span className="text-[9px] font-bold text-center mt-0.5 leading-none">+ Life</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuickLifestyleUpload(product.id, file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Info Principal do Produto ── */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyableId product={product} />
                    
                    {isDuplicate && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                        <Warning size={11} weight="fill" /> {duplicateCount}x Repetido
                      </span>
                    )}

                    {product.dropPercent !== undefined && product.dropPercent > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-950/90 text-red-400 border border-red-800/80">
                        ▼ {product.dropPercent.toFixed(1)}%
                      </span>
                    )}

                    {(product.platformType === 'promobit' || product.platformType === 'pechinchou') && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-950/90 text-orange-400 border border-orange-800/80 flex items-center gap-1">
                        <Warning size={10} weight="fill" /> AGREGADOR
                      </span>
                    )}

                    {!hasLifestyle && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-zinc-800 text-zinc-500 border border-zinc-700/60 hidden sm:inline">
                        Sem Foto Lifestyle
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-1" title={product.name}>
                    {product.name}
                  </div>

                  <div className="text-base font-black text-emerald-400">
                    R$ {product.price ? product.price.toFixed(2) : '0,00'}
                  </div>

                  <div className="flex gap-1.5 items-center mt-0.5">
                    <select
                      value={product.category}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const newCat = prompt("Digite o nome da nova categoria:");
                          if (newCat && newCat.trim()) {
                            handleAutoSave(product.id, 'category', newCat.trim());
                            if (!categories.includes(newCat.trim())) {
                              setCategories(prev => [...prev, newCat.trim()].sort());
                            }
                          }
                        } else {
                          handleAutoSave(product.id, 'category', e.target.value);
                        }
                      }}
                      className={`flex-1 text-xs bg-zinc-800/60 border rounded-lg px-2 py-1.5 text-zinc-200 focus:border-accent outline-none [&>option]:bg-zinc-900 [&>option]:text-zinc-100 ${
                        savingFields[`${product.id}-category`] ? "border-accent/50 opacity-70" : "border-zinc-700/50"
                      }`}
                    >
                      <option value="">Sem categoria...</option>
                      {categories.sort().map(c => <option key={c} value={c}>{c}</option>)}
                      {product.category && !categories.includes(product.category) && <option value={product.category}>{product.category}</option>}
                      <option value="__NEW__" className="text-accent font-semibold">➕ Nova Categoria</option>
                    </select>
                  </div>
                </div>

                {/* ── Inputs de Links (Loja vs Afiliado) ── */}
                <div className="flex flex-col gap-1.5 min-w-0 w-full lg:w-64">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase text-zinc-500 font-semibold">Link da Loja</label>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={sourceUrl} 
                        onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, _localSourceUrl: e.target.value} : p))}
                        onBlur={(e) => handleAutoSave(product.id, 'updateSourceUrl' as any, e.target.value)}
                        className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded px-2 py-1 text-zinc-400 text-xs outline-none focus:border-accent"
                        placeholder="https://..."
                      />
                      {sourceUrl && (
                        <a 
                          href={sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="shrink-0 flex items-center justify-center w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Abrir link original da loja"
                        >
                          <ArrowSquareOut size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase text-zinc-500 font-semibold">Link de Afiliado</label>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={affiliateUrl} 
                        onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, _localAffiliateUrl: e.target.value} : p))}
                        onBlur={(e) => handleAutoSave(product.id, 'updateAffiliateUrl' as any, e.target.value)}
                        className={`flex-1 border rounded px-2 py-1 text-xs outline-none focus:border-accent ${
                          !hasAffiliate && sourceUrl 
                            ? "bg-red-950/30 border-red-800/60 text-red-300" 
                            : "bg-zinc-800/60 border-zinc-700/60 text-emerald-400 font-medium"
                        }`}
                        placeholder="https://..."
                      />
                      {affiliateUrl && (
                        <a 
                          href={affiliateUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="shrink-0 flex items-center justify-center w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Abrir link de afiliado"
                        >
                          <ArrowSquareOut size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Inputs Marca / ID Plataforma ── */}
                <div className="flex flex-col gap-1.5 min-w-0 w-full lg:w-36">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase text-zinc-500 font-semibold">Marca</label>
                    <input 
                      type="text" 
                      value={product.brand || ''} 
                      onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, brand: e.target.value} : p))}
                      onBlur={(e) => handleAutoSave(product.id, 'brand' as any, e.target.value)}
                      className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded px-2 py-1 text-zinc-300 text-xs outline-none focus:border-accent"
                      placeholder="Marca"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase text-zinc-500 font-semibold">ID Plataforma</label>
                    <input 
                      type="text" 
                      value={product.platformProductId || ''} 
                      onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, platformProductId: e.target.value} : p))}
                      onBlur={(e) => handleAutoSave(product.id, 'platformProductId', e.target.value)}
                      className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded px-2 py-1 text-zinc-300 text-xs outline-none focus:border-accent font-mono"
                      placeholder="MLB123..."
                    />
                  </div>
                </div>

                {/* ── Botões de Ação ── */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center mt-2 lg:mt-0">
                  <label className="flex items-center gap-1.5 cursor-pointer group" title="Travar repostagem automática do robô">
                    <input 
                      type="checkbox" 
                      checked={!!product.isFixed} 
                      onChange={(e) => handleAutoSave(product.id, 'isFixed', e.target.checked)}
                      className="w-4 h-4 accent-accent rounded"
                    />
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 whitespace-nowrap">Travar</span>
                  </label>

                  {isPending && (
                    <button
                      onClick={() => handleQuickApprove(product.id)}
                      disabled={approvingId === product.id}
                      className="p-2 bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/60 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                      title="Aprovar produto"
                    >
                      {approvingId === product.id ? <span className="animate-pulse text-xs">...</span> : <Check size={16} weight="bold" />}
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleAutoSave(product.id, 'status', 'expired')}
                      className="p-2 bg-orange-950/30 hover:bg-orange-900/50 border border-orange-800/40 text-orange-400 rounded-lg transition-colors"
                      title="Encerrar Promoção"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    title="Editar produto completo"
                  >
                    <Pencil size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-400 rounded-lg transition-colors"
                    title="Deletar produto"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ═══════════════════════════════════════════
        //  MODO GRADE
        // ═══════════════════════════════════════════
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((product) => {
            const isDuplicate = duplicateStats.duplicateProductIds.has(product.id);
            const hasLifestyle = product.enhancedImageUrl && product.enhancedImageUrl !== product.imageUrl;

            return (
              <div 
                key={product.id} 
                className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
                  isDuplicate ? "border-amber-600/50 shadow-md shadow-amber-950/20" : "border-zinc-800"
                }`}
              >
                <div className="aspect-[4/5] relative bg-white flex items-center justify-center shrink-0">
                  <img
                    src={product.imageUrl} alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-4 cursor-zoom-in"
                    onClick={() => setGalleryProduct(product)}
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                    {isDuplicate && (
                      <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-full bg-amber-500 text-black border border-amber-400 shadow-lg flex items-center gap-1">
                        <Warning size={12} weight="fill" /> Repetido
                      </span>
                    )}
                    {hasLifestyle ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 shadow-lg backdrop-blur-md flex items-center gap-1">
                        <Sparkle size={10} weight="fill" /> Lifestyle ✅
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-900/90 text-zinc-400 border border-zinc-700/80 shadow-lg backdrop-blur-md">
                        Sem Lifestyle
                      </span>
                    )}
                    {product.dropPercent !== undefined && product.dropPercent > 0 && (
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-950/90 text-red-400 border border-red-800/80 shadow-lg backdrop-blur-md">
                        ▼ {product.dropPercent.toFixed(1)}% vs máx
                      </span>
                    )}
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-accent font-mono uppercase truncate">{product.category}</span>
                    <CopyableId product={product} />
                  </div>
                  <h3 className="text-base font-semibold mt-1 line-clamp-2 min-h-[48px]">{product.name}</h3>
                  {product.price && <p className="text-emerald-400 font-bold text-lg mt-1">R$ {product.price.toFixed(2)}</p>}
                  
                  <div className="flex gap-2 mt-4">
                    {product.status === "pending" && (
                      <button onClick={() => handleQuickApprove(product.id)} className="flex items-center justify-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 px-3 py-2 rounded-lg transition-colors">
                        <Check size={16} weight="bold" />
                      </button>
                    )}
                    <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="flex-1 flex justify-center items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm">
                      <Pencil size={16} /> Editar
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 rounded-lg transition-colors">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Overlays ──────────────────────────────────────────────────────── */}
      {galleryProduct && (
        <ImageGalleryOverlay
          product={galleryProduct}
          onClose={() => setGalleryProduct(null)}
          onSelectPrimary={(url) => handleAutoSave(galleryProduct.id, 'imageUrl', url)}
          onSelectLifestyle={(url) => handleAutoSave(galleryProduct.id, 'enhancedImageUrl', url)}
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
