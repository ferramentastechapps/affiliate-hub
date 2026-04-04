"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash, Copy } from "@phosphor-icons/react";
import { CouponModal } from "./CouponModal";

type Coupon = {
  id: string;
  code: string;
  description: string;
  discount: string;
  platform: string;
  isActive: boolean;
  expiresAt?: string;
  product?: {
    name: string;
  };
};

export function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      setCoupons(data);
    } catch (error) {
      console.error("Erro ao buscar cupons:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja deletar este cupom?")) return;

    try {
      await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      fetchCoupons();
    } catch (error) {
      console.error("Erro ao deletar cupom:", error);
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await fetch(`/api/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...coupon, isActive: !coupon.isActive }),
      });
      fetchCoupons();
    } catch (error) {
      console.error("Erro ao atualizar cupom:", error);
    }
  }

  function handleEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingCoupon(null);
    fetchCoupons();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    alert("Código copiado!");
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Gerenciar Cupons</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} weight="bold" />
          Adicionar Cupom
        </button>
      </div>

      <div className="space-y-4">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => copyCode(coupon.code)}
                  className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-lg font-mono font-bold hover:bg-accent/20 transition-colors"
                >
                  {coupon.code}
                  <Copy size={16} />
                </button>
                <span className="text-sm text-zinc-500 uppercase font-medium">
                  {coupon.platform}
                </span>
                {!coupon.isActive && (
                  <span className="text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-zinc-300 mb-1">{coupon.description}</p>
              <p className="text-sm text-accent font-semibold">{coupon.discount}</p>
              {coupon.product && (
                <p className="text-xs text-zinc-500 mt-2">
                  Produto: {coupon.product.name}
                </p>
              )}
              {coupon.expiresAt && (
                <p className="text-xs text-zinc-500 mt-1">
                  Expira em: {new Date(coupon.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(coupon)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  coupon.isActive
                    ? "bg-green-900/20 text-green-400 hover:bg-green-900/30"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {coupon.isActive ? "Ativo" : "Inativo"}
              </button>
              <button
                onClick={() => handleEdit(coupon)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(coupon.id)}
                className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          Nenhum cupom cadastrado ainda.
        </div>
      )}

      <CouponModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        coupon={editingCoupon}
      />
    </div>
  );
}
