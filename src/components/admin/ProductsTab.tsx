"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash,
  GridFour,
  ListDashes,
  ArrowSquareOut,
  Check,
  SortAscending,
  X,
} from "@phosphor-icons/react";
import { ProductModal } from "./ProductModal";
import { ProductsGridSkeleton } from "./SkeletonLoader";

type Product = {
  id: string;
  name: string;
  category: string;
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

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  mercadoLivre: "Meli",
  shopee: "Shopee",
  aliexpress: "AliExpress",
  tiktok: "TikTok",
  magalu: "Magalu",
  kabum: "KaBuM!",
  netshoes: "Netshoes",
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "text-orange-400 border-orange-800/60 bg-orange-950/40",
  mercadoLivre: "text-yellow-400 border-yellow-800/60 bg-yellow-950/40",
  shopee: "text-orange-300 border-orange-700/60 bg-orange-900/30",
  aliexpress: "text-red-400 border-red-800/60 bg-red-950/40",
  tiktok: "text-pink-400 border-pink-800/60 bg-pink-950/40",
  magalu: "text-blue-400 border-blue-800/60 bg-blue-950/40",
  kabum: "text-purple-400 border-purple-800/60 bg-purple-950/40",
  netshoes: "text-green-400 border-green-800/60 bg-green-950/40",
};

// ─── ImagePreviewOverlay ───────────────────────────────────────────────────────
function ImagePreviewOverlay({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-zinc-800/80 rounded-full p-2"
        onClick={onClose}
      >
        <X size={22} />
      </button>
      <img
        src={url}
        alt="Preview"
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[88vh] object-contain rounded-xl shadow-2xl border border-zinc-700/50"
      />
    </div>
  );
}

// ─── ProductsTab ───────────────────────────────────────────────────────────────
export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("date_desc");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

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

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
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
        // Atualiza localmente sem reload completo
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "active" } : p))
        );
      } else {
        alert("Erro ao aprovar produto");
      }
    } catch (error) {
      alert("Erro ao aprovar produto");
    } finally {
      setApprovingId(null);
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
  }

  // ─── Filtro + Sort ─────────────────────────────────────────────────────────
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

  // ─── Helpers de link do produto ───────────────────────────────────────────
  function getBestLink(product: Product): string | null {
    if (product.productLinks && product.productLinks.length > 0) {
      const pl = product.productLinks[0];
      return pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl || null;
    }
    const legacy = product.links;
    if (!legacy) return null;
    return legacy.amazon || legacy.mercadoLivre || legacy.shopee || legacy.aliexpress || legacy.tiktok || null;
  }

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Gerenciar Produtos</h2>
        <button
          onClick={() => setIsModalOpen(true)}
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
            {filter === "fixed" && `🔒 Com Trava`}
            {filter === "notFixed" && `🔓 Sem Trava`}
          </button>
        ))}
      </div>

      {/* ─── Toolbar: Sort + Layout ──────────────────────────────────────── */}
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
          Nenhum produto encontrado neste filtro.
        </div>
      ) : layoutMode === "list" ? (
        // ═══════════════════════════════════════════
        //  MODO LISTA
        // ═══════════════════════════════════════════
        <div className="flex flex-col gap-1.5">
          {/* Cabeçalho da tabela */}
          <div className="hidden md:grid grid-cols-[56px_1fr_140px_160px_auto] gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600 border-b border-zinc-800/60">
            <span>Foto</span>
            <span>Produto</span>
            <span>Links</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {filteredAndSorted.map((product) => {
            const isPending = product.status === "pending";
            const isActive = product.status === "active" || product.status === "approved";
            const bestLink = getBestLink(product);

            return (
              <div
                key={product.id}
                className={`grid grid-cols-[56px_1fr_auto] md:grid-cols-[56px_1fr_140px_160px_auto] gap-3 items-center px-3 py-2.5 rounded-xl border transition-colors ${
                  isPending
                    ? "bg-amber-950/10 border-amber-900/20 hover:border-amber-800/40"
                    : "bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/70"
                }`}
              >
                {/* Miniatura */}
                <button
                  onClick={() => setPreviewImage(product.imageUrl)}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border border-zinc-700/50 hover:border-accent/50 transition-colors group relative"
                  title="Clique para ver foto em tamanho real"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-200"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }}
                  />
                </button>

                {/* Info */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 leading-tight truncate" title={product.name}>
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-accent/80 font-mono uppercase tracking-wider">
                      {product.category}
                    </span>
                    {product.brand && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                        {product.brand}
                      </span>
                    )}
                    {product.price && (
                      <span className="text-[11px] font-bold text-emerald-400">
                        R$ {product.price.toFixed(2)}
                      </span>
                    )}
                    {product.createdAt && (
                      <span className="text-[10px] text-zinc-600">
                        {new Date(product.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Links diretos (desktop) */}
                <div className="hidden md:flex flex-wrap gap-1">
                  {product.productLinks && product.productLinks.length > 0 ? (
                    product.productLinks.map((pl, idx) => {
                      const url = pl.generatedAffiliateUrl || pl.affiliateUrl || pl.sourceUrl;
                      return url ? (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Abrir link ${pl.platform}`}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-0.5 transition-opacity hover:opacity-80 ${
                            PLATFORM_COLORS[pl.platform] || "text-zinc-400 border-zinc-700 bg-zinc-800/40"
                          }`}
                        >
                          {PLATFORM_LABELS[pl.platform] || pl.platform}
                          <ArrowSquareOut size={9} />
                        </a>
                      ) : (
                        <span
                          key={idx}
                          className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded"
                        >
                          {PLATFORM_LABELS[pl.platform] || pl.platform}
                        </span>
                      );
                    })
                  ) : bestLink ? (
                    <a
                      href={bestLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-400 border border-zinc-700 bg-zinc-800/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:text-white transition-colors"
                    >
                      Ver link <ArrowSquareOut size={9} />
                    </a>
                  ) : (
                    <span className="text-[10px] text-zinc-600 italic">Sem links</span>
                  )}
                </div>

                {/* Status badge (desktop) */}
                <div className="hidden md:flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isActive
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                        : isPending
                        ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60"
                    }`}
                  >
                    {isActive ? "Ativo" : isPending ? "Pendente" : product.status}
                  </span>
                  {product.isFixed && (
                    <span className="text-[10px] text-blue-400" title="Com trava">🔒</span>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {isPending && (
                    <button
                      onClick={() => handleQuickApprove(product.id)}
                      disabled={approvingId === product.id}
                      title="Aprovar produto (silencioso — sem notificação imediata)"
                      className="flex items-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      {approvingId === product.id ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        <Check size={14} weight="bold" />
                      )}
                      <span className="hidden sm:inline">Aprovar</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(product)}
                    title="Editar produto"
                    className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 px-2 py-1.5 rounded-lg transition-colors text-xs text-zinc-300"
                  >
                    <Pencil size={14} />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    title="Deletar produto"
                    className="flex items-center justify-center bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash size={14} />
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
          {filteredAndSorted.map((product) => (
            <div
              key={product.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              <div className="aspect-[4/5] relative bg-white flex items-center justify-center shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-4 cursor-zoom-in"
                  onClick={() => setPreviewImage(product.imageUrl)}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }}
                />
                {product.images && product.images.length > 0 && (
                  <div className="absolute bottom-3 left-3 flex items-center justify-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white">
                    📸 {product.images.length}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-lg backdrop-blur-md ${
                      product.status === "active" || product.status === "approved"
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                        : product.status === "pending"
                        ? "bg-amber-950/80 text-amber-400 border-amber-800/80"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/80"
                    }`}
                  >
                    {product.status === "active" || product.status === "approved" ? "Ativo" : "Pendente"}
                  </span>
                  {product.isFixed && (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-lg backdrop-blur-md bg-blue-950/80 text-blue-400 border-blue-800/80">
                      🔄 Repost
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-accent font-mono uppercase">
                    {product.category}
                  </span>
                  {product.brand && (
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-medium border border-zinc-700">
                      {product.brand}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mt-1 line-clamp-2 min-h-[56px]">
                  {product.name}
                </h3>
                {product.price && (
                  <p className="text-zinc-400 mt-1 font-medium">
                    R$ {product.price.toFixed(2)}
                  </p>
                )}
                <div className="mt-3 flex gap-1 flex-wrap min-h-[24px]">
                  {product.productLinks && product.productLinks.length > 0 ? (
                    product.productLinks.map((pl, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-zinc-800/50 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800 capitalize"
                      >
                        {pl.platform === "mercadoLivre" ? "Meli" : pl.platform}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-600 italic">Sem links gerados</span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  {product.status === "pending" && (
                    <button
                      onClick={() => handleQuickApprove(product.id)}
                      disabled={approvingId === product.id}
                      title="Aprovar produto"
                      className="flex items-center justify-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 px-3 py-2 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Pencil size={16} />
                    Editar / Moderar
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Image Preview Overlay ───────────────────────────────────────── */}
      {previewImage && (
        <ImagePreviewOverlay
          url={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ─── Modal ──────────────────────────────────────────────────────── */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={editingProduct}
      />
    </div>
  );
}
