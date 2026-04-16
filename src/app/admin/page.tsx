"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { CouponsTab } from "@/components/admin/CouponsTab";

// Página do admin não precisa de revalidação pois é client-side
// Mas vamos adicionar metadata via layout se necessário

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"products" | "coupons">("products");

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Painel Admin</h1>
          <a
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Voltar ao site
          </a>
        </div>

        <div className="flex gap-4 mb-8 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "products"
                ? "text-accent border-b-2 border-accent"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "coupons"
                ? "text-accent border-b-2 border-accent"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Cupons
          </button>
        </div>

        {activeTab === "products" && <ProductsTab />}
        {activeTab === "coupons" && <CouponsTab />}
      </div>
    </div>
  );
}
