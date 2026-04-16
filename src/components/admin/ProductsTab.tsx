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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
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

      {loading ? (
        <ProductsGridSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                <div className="aspect-[4/5] relative">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <span className="text-xs text-accent font-mono uppercase">
                    {product.category}
                  </span>
                  <h3 className="text-lg font-semibold mt-1">{product.name}</h3>
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
                      Editar
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

          {products.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Nenhum produto cadastrado ainda.
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
