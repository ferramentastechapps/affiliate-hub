"use client";

import { useState, useEffect } from "react";
import { X, MagicWand } from "@phosphor-icons/react";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
};

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    imageUrl: "",
    price: "",
    amazon: "",
    mercadoLivre: "",
    shopee: "",
    aliexpress: "",
    tiktok: "",
  });
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        price: product.price?.toString() || "",
        amazon: product.links?.amazon || "",
        mercadoLivre: product.links?.mercadoLivre || "",
        shopee: product.links?.shopee || "",
        aliexpress: product.links?.aliexpress || "",
        tiktok: product.links?.tiktok || "",
      });
    } else {
      setFormData({
        name: "",
        category: "",
        description: "",
        imageUrl: "",
        price: "",
        amazon: "",
        mercadoLivre: "",
        shopee: "",
        aliexpress: "",
        tiktok: "",
      });
    }
  }, [product, isOpen]);

  async function handleScrape() {
    if (!scrapeUrl) return;

    setLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl }),
      });

      const data = await res.json();
      
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        imageUrl: data.imageUrl || prev.imageUrl,
        price: data.price?.toString() || prev.price,
        description: data.description || prev.description,
      }));

      // Adicionar URL ao campo correto baseado na plataforma
      if (scrapeUrl.includes("amazon")) {
        setFormData((prev) => ({ ...prev, amazon: scrapeUrl }));
      } else if (scrapeUrl.includes("mercadolivre")) {
        setFormData((prev) => ({ ...prev, mercadoLivre: scrapeUrl }));
      } else if (scrapeUrl.includes("shopee")) {
        setFormData((prev) => ({ ...prev, shopee: scrapeUrl }));
      } else if (scrapeUrl.includes("aliexpress")) {
        setFormData((prev) => ({ ...prev, aliexpress: scrapeUrl }));
      } else if (scrapeUrl.includes("tiktok")) {
        setFormData((prev) => ({ ...prev, tiktok: scrapeUrl }));
      }

      setScrapeUrl("");
    } catch (error) {
      alert("Erro ao buscar dados do produto");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        imageUrl: formData.imageUrl,
        price: formData.price ? parseFloat(formData.price) : null,
        links: {
          amazon: formData.amazon || null,
          mercadoLivre: formData.mercadoLivre || null,
          shopee: formData.shopee || null,
          aliexpress: formData.aliexpress || null,
          tiktok: formData.tiktok || null,
        },
      };

      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onClose();
    } catch (error) {
      alert("Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {product ? "Editar Produto" : "Adicionar Produto"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">
              Buscar dados automaticamente
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="Cole o link do produto (Amazon, Mercado Livre, etc)"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={loading || !scrapeUrl}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 disabled:text-zinc-500 text-black px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <MagicWand size={20} />
                Buscar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nome *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            >
              <option value="">Selecione...</option>
              <option value="Gaming">Gaming</option>
              <option value="Home Office">Home Office</option>
              <option value="Setup">Setup</option>
              <option value="Streaming">Streaming</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL da Imagem *</label>
            <input
              type="url"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold mb-4">Links de Afiliados</h3>
            <div className="space-y-3">
              {["amazon", "mercadoLivre", "shopee", "aliexpress", "tiktok"].map((platform) => (
                <div key={platform}>
                  <label className="block text-sm font-medium mb-2 capitalize">
                    {platform === "mercadoLivre" ? "Mercado Livre" : platform}
                  </label>
                  <input
                    type="url"
                    value={formData[platform as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [platform]: e.target.value })}
                    placeholder={`https://...`}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 text-black px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
