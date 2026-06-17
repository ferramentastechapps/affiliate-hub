"use client";

import { useState } from "react";
import { ArrowLeft, ShoppingCart, Copy, Check } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string;
  price: number | null;
  originalPrice: number | null;
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
};

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercadoLivre: "Mercado Livre",
  shopee: "Shopee",
  aliexpress: "AliExpress",
  tiktok: "TikTok Shop",
};

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleBuyClick = (platform: string, url: string) => {
    // Redireciona para a API /api/go com o parâmetro da plataforma
    window.open(`/api/go/${product.id}?platform=${platform}`, '_blank');
  };

  // Filtrar links disponíveis
  const availableLinks = product.links
    ? Object.entries(product.links).filter(([_, url]) => url && url.trim() !== "")
    : [];

  const hasDiscount = product.originalPrice && product.price && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Botão Voltar */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Imagem do Produto */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.webp";
              }}
            />
            {hasDiscount && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-sm text-accent font-mono uppercase">{product.category}</span>
              <h1 className="text-3xl md:text-4xl font-bold mt-2">{product.name}</h1>
            </div>

            {/* Preço */}
            {product.price && (
              <div className="flex flex-col gap-2">
                {hasDiscount && (
                  <span className="text-zinc-500 line-through text-lg">
                    R$ {product.originalPrice?.toFixed(2).replace(".", ",")}
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-accent">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                  {hasDiscount && (
                    <span className="text-emerald-400 font-semibold">
                      Economize R$ {(product.originalPrice! - product.price).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Descrição */}
            {product.description && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2">Sobre o produto</h3>
                <p className="text-zinc-400 text-sm whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Cupons */}
            {product.coupons && product.coupons.length > 0 && (
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🎟️ Cupons Disponíveis
                </h3>
                <div className="space-y-2">
                  {product.coupons.map((coupon) => (
                    <div
                      key={coupon.code}
                      className="flex items-center justify-between bg-black/40 rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-accent font-mono font-bold">{coupon.code}</code>
                          <span className="text-xs text-zinc-400">{coupon.discount}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{coupon.description}</p>
                      </div>
                      <button
                        onClick={() => handleCopyCoupon(coupon.code)}
                        className="ml-2 p-2 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {copiedCoupon === coupon.code ? (
                          <Check size={18} className="text-emerald-400" />
                        ) : (
                          <Copy size={18} className="text-zinc-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões de Compra */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
                Comprar em:
              </h3>
              {availableLinks.length > 0 ? (
                availableLinks.map(([platform, url]) => (
                  <button
                    key={platform}
                    onClick={() => handleBuyClick(platform, url as string)}
                    className="w-full flex items-center justify-center gap-3 bg-accent hover:bg-accent/90 text-black px-6 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ShoppingCart size={24} weight="bold" />
                    Comprar na {PLATFORM_NAMES[platform] || platform}
                  </button>
                ))
              ) : (
                <p className="text-zinc-500 text-sm italic">Nenhum link disponível no momento.</p>
              )}
            </div>

            {/* Garantia/Informações Adicionais */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
              <ul className="space-y-2">
                <li>✓ Links de afiliados - você ajuda o site sem pagar mais por isso</li>
                <li>✓ Preços e disponibilidade verificados regularmente</li>
                <li>✓ Compra segura diretamente nas lojas oficiais</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
