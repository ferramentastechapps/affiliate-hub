"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash, Eye, EyeSlash, Image } from "@phosphor-icons/react";
import { BannerModal } from "./BannerModal";

type Banner = {
  id: string;
  title: string;
  imageDesktop: string;
  imageMobile: string;
  link: string;
  order: number;
  isActive: boolean;
};

export function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    try {
      setLoading(true);
      // Admin busca todos (incluindo inativos)
      const res = await fetch("/api/banners?all=true");
      const data = await res.json();
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar este banner?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    fetchBanners();
  }

  async function handleToggle(banner: Banner) {
    await fetch(`/api/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    fetchBanners();
  }

  function openNew() {
    setEditingBanner(null);
    setIsModalOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditingBanner(banner);
    setIsModalOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-zinc-400 text-sm">{banners.length} banner(s) cadastrado(s)</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={18} weight="bold" />
          Novo Banner
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
          <Image size={48} weight="duotone" />
          <p className="text-sm">Nenhum banner cadastrado ainda.</p>
          <button onClick={openNew} className="text-accent text-sm hover:underline">
            Adicionar primeiro banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
                banner.isActive ? "border-zinc-800" : "border-zinc-800/40 opacity-60"
              }`}
            >
              {/* Preview desktop */}
              <div className="relative h-32 bg-zinc-800">
                <img
                  src={banner.imageDesktop}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  Desktop
                </div>
                {/* Mobile preview thumbnail */}
                <div className="absolute top-2 right-2 w-10 h-14 rounded-lg overflow-hidden border-2 border-white/20 bg-zinc-700">
                  <img
                    src={banner.imageMobile}
                    alt="mobile"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5">
                    mob
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm truncate">{banner.title}</h3>
                  <span className="text-zinc-500 text-xs shrink-0">#{banner.order}</span>
                </div>
                {banner.link && (
                  <p className="text-zinc-500 text-xs truncate mb-3">🔗 {banner.link}</p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleToggle(banner)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      banner.isActive
                        ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    }`}
                  >
                    {banner.isActive ? <Eye size={14} /> : <EyeSlash size={14} />}
                    {banner.isActive ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    onClick={() => openEdit(banner)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="ml-auto p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchBanners}
        editingBanner={editingBanner}
      />
    </div>
  );
}
