"use client";

import { useState, useEffect } from "react";
import { X } from "@phosphor-icons/react";

type CouponModalProps = {
  isOpen: boolean;
  onClose: () => void;
  coupon?: any;
};

export function CouponModal({ isOpen, onClose, coupon }: CouponModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount: "",
    platform: "",
    productId: "",
    expiresAt: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }

    if (coupon) {
      setFormData({
        code: coupon.code || "",
        description: coupon.description || "",
        discount: coupon.discount || "",
        platform: coupon.platform || "",
        productId: coupon.productId || "",
        expiresAt: coupon.expiresAt
          ? new Date(coupon.expiresAt).toISOString().split("T")[0]
          : "",
      });
    } else {
      setFormData({
        code: "",
        description: "",
        discount: "",
        platform: "",
        productId: "",
        expiresAt: "",
      });
    }
  }, [coupon, isOpen]);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        productId: formData.productId || null,
        expiresAt: formData.expiresAt || null,
      };

      const url = coupon ? `/api/coupons/${coupon.id}` : "/api/coupons";
      const method = coupon ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onClose();
    } catch (error) {
      alert("Erro ao salvar cupom");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full">
        <div className="border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {coupon ? "Editar Cupom" : "Adicionar Cupom"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Código *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="DESCONTO10"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição *</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="10% de desconto na primeira compra"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Desconto *</label>
            <input
              type="text"
              required
              value={formData.discount}
              onChange={(e) =>
                setFormData({ ...formData, discount: e.target.value })
              }
              placeholder="10% OFF ou R$ 50 OFF"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Plataforma *</label>
            <select
              required
              value={formData.platform}
              onChange={(e) =>
                setFormData({ ...formData, platform: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            >
              <option value="">Selecione...</option>
              <option value="Amazon">Amazon</option>
              <option value="Mercado Livre">Mercado Livre</option>
              <option value="Shopee">Shopee</option>
              <option value="AliExpress">AliExpress</option>
              <option value="TikTok">TikTok</option>
              <option value="Geral">Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Produto (opcional)
            </label>
            <select
              value={formData.productId}
              onChange={(e) =>
                setFormData({ ...formData, productId: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            >
              <option value="">Nenhum (cupom geral)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Data de Expiração (opcional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) =>
                setFormData({ ...formData, expiresAt: e.target.value })
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
            />
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
