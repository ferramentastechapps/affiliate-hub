"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash } from "@phosphor-icons/react";
import { ProductModal } from "./ProductModal";
import { ProductsGridSkeleton } from "./SkeletonLoader";

type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: number;
  status?: string;
  links?: {
    amazon?: string;
    mercadoLivre?: string;
    shopee?: string;
    aliexpress?: string;
    tiktok?: string;
  };
};

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
  }

  const filteredProducts = products.filter((product) => {
    if (statusFilter === 'active') {
      return product.status === 'active' || product.status === 'approved';
    }
    if (statusFilter === 'pending') {
      return product.status === 'pending';
    }
    return true; // 'all'
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Gerenciar Produtos</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} weight="bold" />
          Adicionar Produto
        </button>
      </div>

      {/* Abas de Filtro de Status */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-4">
        {(['all', 'active', 'pending'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === filter
                ? "bg-zinc-800 text-accent border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {filter === 'all' && 'Todos'}
            {filter === 'active' && 'Ativos'}
            {filter === 'pending' && 'Pendentes'}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductsGridSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                <div className="aspect-[4/5] relative bg-zinc-950 flex items-center justify-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Etiqueta de Status */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-lg backdrop-blur-md ${
                      product.status === 'active' || product.status === 'approved'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                        : product.status === 'pending'
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/80'
                    }`}>
                      {product.status === 'active' || product.status === 'approved' ? 'Ativo' : 'Pendente'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-xs text-accent font-mono uppercase">
                    {product.category}
                  </span>
                  <h3 className="text-lg font-semibold mt-1 line-clamp-2 min-h-[56px]">{product.name}</h3>
                  {product.price && (
                    <p className="text-zinc-400 mt-1">
                      R$ {product.price.toFixed(2)}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors"
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

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Nenhum produto encontrado neste filtro.
            </div>
          )}
        </>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={editingProduct}
      />
    </div>
  );
}
