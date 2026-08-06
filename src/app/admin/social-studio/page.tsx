"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { 
  Camera, 
  Sparkle, 
  DownloadSimple, 
  QrCode, 
  Tag, 
  Flame, 
  Storefront, 
  Lightning, 
  ShareNetwork,
  CheckCircle,
  Copy
} from "@phosphor-icons/react";

export default function SocialStudioPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [format, setFormat] = useState<"story" | "feed">("story");
  const [theme, setTheme] = useState<"rose" | "dark" | "emerald" | "purple">("rose");
  const [customBadge, setCustomBadge] = useState<string>("MENOR PREÇO HISTÓRICO");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products?filter=recentes");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
        setSelectedProductId(data[0].id);
      }
    } catch (e) {
      console.error("Erro ao buscar produtos para o Social Studio", e);
    } finally {
      setLoading(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const themeStyles = {
    rose: {
      bg: "from-zinc-950 via-rose-950 to-zinc-950",
      border: "border-rose-500/30",
      accentBg: "bg-gradient-to-r from-rose-500 to-amber-500",
      textAccent: "text-rose-400",
      priceText: "text-rose-400",
      glow: "shadow-[0_0_50px_rgba(244,63,94,0.3)]",
    },
    dark: {
      bg: "from-zinc-950 via-zinc-900 to-zinc-950",
      border: "border-zinc-700/50",
      accentBg: "bg-gradient-to-r from-zinc-700 to-zinc-500",
      textAccent: "text-zinc-300",
      priceText: "text-white",
      glow: "shadow-[0_0_50px_rgba(255,255,255,0.15)]",
    },
    emerald: {
      bg: "from-zinc-950 via-emerald-950 to-zinc-950",
      border: "border-emerald-500/30",
      accentBg: "bg-gradient-to-r from-emerald-500 to-teal-400",
      textAccent: "text-emerald-400",
      priceText: "text-emerald-400",
      glow: "shadow-[0_0_50px_rgba(16,185,129,0.3)]",
    },
    purple: {
      bg: "from-zinc-950 via-purple-950 to-zinc-950",
      border: "border-purple-500/30",
      accentBg: "bg-gradient-to-r from-purple-500 to-indigo-500",
      textAccent: "text-purple-400",
      priceText: "text-purple-400",
      glow: "shadow-[0_0_50px_rgba(168,85,247,0.3)]",
    },
  };

  const currentTheme = themeStyles[theme];

  const price = selectedProduct?.price || 0;
  const originalPrice = selectedProduct?.originalPrice || 0;
  const discount = originalPrice > price && price > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const productUrl = selectedProduct 
    ? `https://economizei.ftech-apps.com.br/produto/${selectedProduct.shortId || selectedProduct.id}`
    : "https://economizei.ftech-apps.com.br";

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(productUrl)}&color=ffffff&bgcolor=09090b`;

  const copyProductLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Camera size={28} className="text-rose-500" />
              Social Marketing Studio
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gere cards visuais incríveis de ofertas (Stories 9:16 e Feeds 1:1) com QR Code para Instagram, TikTok e Telegram.
            </p>
          </div>
        </div>

        {/* Studio Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Form (Left Column) */}
          <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 p-6 rounded-3xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkle size={20} className="text-amber-400" /> Configurar Oferta
            </h3>

            {/* Selector de Produto */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Selecione o Produto
              </label>
              {loading ? (
                <div className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {p.price?.toFixed(2)} ({p.category || "Geral"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Formato do Card */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Formato do Card
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    format === "story"
                      ? "bg-rose-500/10 border-rose-500 text-rose-400 shadow-md"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  📱 Story (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("feed")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    format === "feed"
                      ? "bg-rose-500/10 border-rose-500 text-rose-400 shadow-md"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  🖼️ Feed / Post (1:1)
                </button>
              </div>
            </div>

            {/* Tema Visual */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Estilo Visual (Tema)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "rose", label: "Neon Rose", color: "bg-rose-500" },
                  { key: "dark", label: "Dark Glass", color: "bg-zinc-400" },
                  { key: "emerald", label: "Emerald Deal", color: "bg-emerald-500" },
                  { key: "purple", label: "Cyber Purple", color: "bg-purple-500" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      theme === t.key
                        ? "border-white text-white bg-zinc-800"
                        : "border-zinc-800 text-zinc-400 bg-zinc-950 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Badge Personalizada */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Texto da Badge de Destaque
              </label>
              <input
                type="text"
                value={customBadge}
                onChange={(e) => setCustomBadge(e.target.value)}
                placeholder="Ex: MENOR PREÇO HISTÓRICO"
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Ações */}
            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={copyProductLink}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <CheckCircle size={18} className="text-emerald-400" /> : <Copy size={18} />}
                {copied ? "Link Copiado!" : "Copiar Link de Afiliado"}
              </button>
            </div>
          </div>

          {/* Canvas Live Preview (Right Column) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="mb-3 flex items-center gap-2 text-zinc-400 text-xs">
              <Lightning size={14} className="text-amber-400" /> Visualização em Tempo Real (HD)
            </div>

            {/* Card Frame */}
            {selectedProduct && (
              <div
                ref={cardRef}
                className={`relative bg-gradient-to-b ${currentTheme.bg} ${currentTheme.glow} border ${currentTheme.border} rounded-3xl p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                  format === "story" ? "w-[340px] h-[600px]" : "w-[440px] h-[440px]"
                }`}
              >
                {/* Background Decorative Elements */}
                <div className="absolute -top-20 -left-20 w-48 h-48 bg-rose-500/20 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

                {/* Top Header Branding */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center font-black text-white text-sm shadow-md">
                      E
                    </div>
                    <span className="font-black text-white tracking-tight text-sm">ECONOMEIZEI</span>
                  </div>
                  {customBadge && (
                    <span className="bg-amber-400 text-zinc-950 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                      🔥 {customBadge}
                    </span>
                  )}
                </div>

                {/* Product Image Container */}
                <div className="my-auto py-2 flex flex-col items-center justify-center z-10 relative">
                  <div className="w-44 h-44 bg-white rounded-2xl p-3 shadow-2xl flex items-center justify-center relative">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                    {discount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-lg border border-white/20">
                        -{discount}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Details & Price */}
                <div className="space-y-3 z-10 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                    {selectedProduct.category || "OFERTA IMPERDÍVEL"}
                  </span>
                  <h2 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {selectedProduct.name}
                  </h2>

                  <div className="flex items-end justify-between pt-1">
                    <div>
                      {originalPrice > price && (
                        <span className="text-xs text-zinc-400 line-through block">
                          R$ {originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span className={`text-2xl font-black ${currentTheme.priceText}`}>
                        R$ {price.toFixed(2)}
                      </span>
                    </div>

                    {/* QR Code */}
                    <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10">
                      <img src={qrCodeUrl} alt="QR Code Link" className="w-10 h-10 rounded-md" />
                      <div className="text-[8px] font-bold text-zinc-300 leading-tight">
                        <span>ESCANIE O</span><br />
                        <span className="text-rose-400">QR CODE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer URL Callout */}
                <div className="pt-2 text-center text-[9px] text-zinc-400 font-semibold tracking-wide z-10">
                  https://economizei.ftech-apps.com.br
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
