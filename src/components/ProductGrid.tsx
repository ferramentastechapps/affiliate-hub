"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ProductCard, type Product } from "./ProductCard";
import { PlatformModal } from "./PlatformModal";

const fallbackProducts: Product[] = [
  {
    id: "p1",
    name: "Cadeira Ergonômica Pro",
    category: "Home Office",
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=1000&fit=crop",
    links: {
      amazon: "https://amazon.com.br/cadeira-ergonomica",
      mercadoLivre: "https://mercadolivre.com.br/cadeira",
    }
  },
  {
    id: "p2",
    name: "Microfone Studio X",
    category: "Streaming",
    imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop",
    links: {
      aliexpress: "https://aliexpress.com/microfone",
      shopee: "https://shopee.com.br/microfone",
      tiktok: "https://tiktok.com/shop/microfone"
    }
  },
  {
    id: "p3",
    name: "Ring Light 18 Polegadas",
    category: "Setup",
    imageUrl: "https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=800&h=1200&fit=crop",
    links: {
      amazon: "https://amazon.com.br/ring-light",
      mercadoLivre: "https://mercadolivre.com.br/ring-light",
      shopee: "https://shopee.com.br/ring-light"
    }
  },
  {
    id: "p4",
    name: "Teclado Mecânico RGB",
    category: "Gaming",
    imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&h=900&fit=crop",
    links: {
      aliexpress: "https://aliexpress.com/teclado",
      amazon: "https://amazon.com.br/teclado-mecanico"
    }
  },
  {
    id: "p5",
    name: "Webcam 4K Ultra HD",
    category: "Streaming",
    imageUrl: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&h=1000&fit=crop",
    links: {
      tiktok: "https://tiktok.com/shop/webcam",
      mercadoLivre: "https://mercadolivre.com.br/webcam"
    }
  },
  {
    id: "p6",
    name: "Mouse Gamer Wireless",
    category: "Gaming",
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&h=950&fit=crop",
    links: {
      amazon: "https://amazon.com.br/mouse-gamer",
      shopee: "https://shopee.com.br/mouse",
      aliexpress: "https://aliexpress.com/mouse"
    }
  },
  {
    id: "p7",
    name: "Headset Gamer 7.1",
    category: "Gaming",
    imageUrl: "https://images.unsplash.com/photo-1599669454699-248893623440?w=800&h=1100&fit=crop",
    links: {
      mercadoLivre: "https://mercadolivre.com.br/headset",
      amazon: "https://amazon.com.br/headset-gamer"
    }
  },
  {
    id: "p8",
    name: "Monitor Ultrawide 34\"",
    category: "Setup",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=850&fit=crop",
    links: {
      amazon: "https://amazon.com.br/monitor-ultrawide",
      mercadoLivre: "https://mercadolivre.com.br/monitor"
    }
  },
  {
    id: "p9",
    name: "Suporte Articulado Duplo",
    category: "Home Office",
    imageUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=1000&fit=crop",
    links: {
      shopee: "https://shopee.com.br/suporte-monitor",
      aliexpress: "https://aliexpress.com/monitor-arm",
      amazon: "https://amazon.com.br/suporte-monitor"
    }
  },
  {
    id: "p10",
    name: "Luminária LED Smart",
    category: "Setup",
    imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&h=1150&fit=crop",
    links: {
      tiktok: "https://tiktok.com/shop/luminaria",
      shopee: "https://shopee.com.br/luminaria-led"
    }
  },
  {
    id: "p11",
    name: "Mousepad XXL Gamer",
    category: "Gaming",
    imageUrl: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&h=900&fit=crop",
    links: {
      aliexpress: "https://aliexpress.com/mousepad",
      shopee: "https://shopee.com.br/mousepad",
      mercadoLivre: "https://mercadolivre.com.br/mousepad"
    }
  },
  {
    id: "p12",
    name: "Apoio de Pulso Ergonômico",
    category: "Home Office",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=1050&fit=crop",
    links: {
      amazon: "https://amazon.com.br/apoio-pulso",
      mercadoLivre: "https://mercadolivre.com.br/apoio"
    }
  }
];

export function ProductGrid() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        if (data.length === 0) {
          setProducts([]);
        } else {
          const formattedProducts = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            imageUrl: p.imageUrl,
            links: {
              amazon: p.links?.amazon,
              mercadoLivre: p.links?.mercadoLivre,
              shopee: p.links?.shopee,
              aliexpress: p.links?.aliexpress,
              tiktok: p.links?.tiktok,
            }
          }));
          setProducts(formattedProducts);
        }
      } else {
        console.error("Erro da API. Resposta não é array:", data);
        setProducts([]);
      }
    } catch (error) {
      console.error("Erro real na hora de dar o fetch:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Carregando produtos...
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <h3 className="text-xl font-medium mb-2">Nenhum produto encontrado</h3>
        <p>Ainda não há produtos cadastrados ou ocorreu um erro na busca.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1400px] mx-auto w-full px-4 md:px-8 pb-32"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
      >
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={setSelectedProduct} 
          />
        ))}
      </motion.div>

      <PlatformModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </>
  );
}
