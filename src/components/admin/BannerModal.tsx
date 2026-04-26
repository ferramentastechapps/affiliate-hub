"use client";

import { useState, useEffect } from "react";
import { X, Image, Link, ArrowsDownUp } from "@phosphor-icons/react";

type Banner = {
  id?: string;
  title: string;
  imageDesktop: string;
  imageMobile: string;
  link: string;
  order: number;
  isActive?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingBanner?: Banner | null;
};

const empty: Banner = { title: "", imageDesktop: "", imageMobile: "", link: "", order: 0 };

export function BannerModal({ isOpen, onClose, onSave, editingBanner }: Props) {
  const [form, setForm] = useState<Banner>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(editingBanner ? { ...editingBanner } : empty);
    setError("");
  }, [editingBanner, isOpen]);

  if (!isOpen) return null;

  const set = (field: keyof Banner, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.imageDesktop || !form.imageMobile) {
      setError("Título, imagem desktop e imagem mobile são obrigatórios.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = editingBanner?.id ? `/api/banners/${editingBanner.id}` : "/api/banners";
      const method = editingBanner?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar banner");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">
            {editingBanner?.id ? "Editar Banner" : "Novo Banner"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Promoção de Verão"
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Imagem Desktop */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Image size={16} className="text-accent" />
              Imagem Desktop (URL)
            </label>
            <input
              type="url"
              value={form.imageDesktop}
              onChange={(e) => set("imageDesktop", e.target.value)}
              placeholder="https://... (1400×280px recomendado)"
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-accent"
            />
            {form.imageDesktop && (
              <img
                src={form.imageDesktop}
                alt="preview desktop"
                className="w-full h-20 object-cover rounded-xl border border-zinc-700 mt-1"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>

          {/* Imagem Mobile */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Image size={16} className="text-blue-400" />
              Imagem Mobile (URL)
            </label>
            <input
              type="url"
              value={form.imageMobile}
              onChange={(e) => set("imageMobile", e.target.value)}
              placeholder="https://... (800×400px recomendado)"
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-accent"
            />
            {form.imageMobile && (
              <img
                src={form.imageMobile}
                alt="preview mobile"
                className="w-full h-20 object-cover rounded-xl border border-zinc-700 mt-1"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>

          {/* Link */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Link size={16} className="text-zinc-400" />
              Link ao clicar (opcional)
            </label>
            <input
              type="url"
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://..."
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Ordem */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <ArrowsDownUp size={16} className="text-zinc-400" />
              Ordem de exibição
            </label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => set("order", parseInt(e.target.value) || 0)}
              min={0}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent w-32"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
