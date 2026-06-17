"use client";

import { useState, useEffect } from "react";
import { X, MagicWand, TelegramLogo, Check, PaperPlaneTilt } from "@phosphor-icons/react";

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
    isFixed: false,
  });
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para busca de imagem e Telegram (Opção C)
  const [alternativeImages, setAlternativeImages] = useState<any[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [telegramLoading, setTelegramLoading] = useState<string | null>(null);

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
        isFixed: product.isFixed || false,
      });
      setSearchQuery(product.name || "");
      handleSearchImages(product.name || "");
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
        isFixed: false,
      });
      setAlternativeImages([]);
      setSearchQuery("");
    }
  }, [product, isOpen]);

  async function handleSearchImages(queryText: string) {
    if (!queryText || queryText.length < 3) return;
    setSearchingImages(true);
    try {
      const res = await fetch(`/api/scrape/images?q=${encodeURIComponent(queryText)}`);
      if (res.ok) {
        const data = await res.json();
        setAlternativeImages(data.slice(0, 16));
      } else {
        setAlternativeImages([]);
      }
    } catch (error) {
      console.error("Erro ao buscar imagens:", error);
      setAlternativeImages([]);
    } finally {
      setSearchingImages(false);
    }
  }

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

      // Se retornou nome do produto, busca imagens no DDG
      if (data.name) {
        setSearchQuery(data.name);
        handleSearchImages(data.name);
      }

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

  async function handleSaveWithStatus(status: 'active' | 'pending' | 'approved', e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        imageUrl: formData.imageUrl,
        price: formData.price ? parseFloat(formData.price) : null,
        status,
        isFixed: formData.isFixed,
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
      } else {
        alert("Erro ao salvar produto");
      }
    } catch (error) {
      alert("Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  }

  async function handleTelegramAction(action: 'moderate' | 'publish', e: React.MouseEvent) {
    e.preventDefault();
    if (!product?.id) {
      alert("Salve o produto primeiro antes de interagir com o Telegram!");
      return;
    }

    setTelegramLoading(action);
    try {
      // 1. Salvar dados atuais do modal e mudar status se for publicação direta
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        imageUrl: formData.imageUrl,
        price: formData.price ? parseFloat(formData.price) : null,
        status: action === 'publish' ? 'active' : undefined,
        isFixed: formData.isFixed,
        links: {
          amazon: formData.amazon || null,
          mercadoLivre: formData.mercadoLivre || null,
          shopee: formData.shopee || null,
          aliexpress: formData.aliexpress || null,
          tiktok: formData.tiktok || null,
        },
      };

      const saveRes = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        throw new Error("Falha ao salvar produto antes de enviar ao Telegram");
      }

      // 2. Chamar endpoint do Telegram
      const res = await fetch(`/api/products/${product.id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Ação concluída com sucesso!");
        onClose();
      } else {
        alert(`Erro: ${data.error}. ${data.details || ''}`);
      }
    } catch (err: any) {
      console.error("Erro na ação do Telegram:", err);
      alert(err.message || "Falha ao enviar ação para o Telegram");
    } finally {
      setTelegramLoading(null);
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
        isFixed: formData.isFixed,
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

  const isPending = product && product.status === "pending";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              {product ? (isPending ? "Moderar Produto Pendente" : "Editar Produto") : "Adicionar Produto"}
            </h2>
            {isPending && (
              <span className="text-xs text-amber-400 font-medium">Aguardando aprovação</span>
            )}
          </div>
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
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={loading || !scrapeUrl}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 disabled:text-zinc-500 text-black px-4 py-2 rounded-lg font-medium transition-colors text-sm"
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
            >
              <option value="">Selecione...</option>
              <option value="Smartphones e TV">Smartphones e TV</option>
              <option value="Informática e Games">Informática e Games</option>
              <option value="Casa e Eletrodomésticos">Casa e Eletrodomésticos</option>
              <option value="Moda e Acessórios">Moda e Acessórios</option>
              <option value="Saúde e Beleza">Saúde e Beleza</option>
              <option value="Esporte e Suplementos">Esporte e Suplementos</option>
              <option value="Supermercado e Delivery">Supermercado e Delivery</option>
              <option value="Bebês e Crianças">Bebês e Crianças</option>
              <option value="Livros, eBooks e eReaders">Livros, eBooks e eReaders</option>
              <option value="Ferramentas e Jardim">Ferramentas e Jardim</option>
              <option value="Automotivo">Automotivo</option>
              <option value="Pet">Pet</option>
              <option value="Viagem">Viagem</option>
              <option value="Diversos">Diversos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL da Imagem *</label>
            <input
              type="url"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
            />
          </div>

          {/* Grade de Imagens Alternativas (Opção C) */}
          <div className="bg-zinc-850/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">Imagens Alternativas (Opção C)</span>
              {searchingImages && <span className="text-xs text-accent animate-pulse">Buscando imagens...</span>}
            </div>

            {alternativeImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
                {alternativeImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: img.image }))}
                    className={`aspect-square relative rounded-md overflow-hidden bg-zinc-900 border transition-all hover:scale-[1.03] ${
                      formData.imageUrl === img.image
                        ? 'border-accent ring-1 ring-accent'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={img.thumbnail || img.image}
                      alt={img.title || "Imagem alternativa"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.webp";
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Nenhuma imagem alternativa encontrada.</p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Palavra-chave para buscar imagens..."
                className="flex-1 bg-zinc-900 text-xs border border-zinc-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => handleSearchImages(searchQuery)}
                disabled={searchingImages || !searchQuery}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-xs text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 p-4 rounded-xl">
              <div className="flex items-center h-5">
                <input
                  id="isFixed"
                  type="checkbox"
                  checked={formData.isFixed}
                  onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-accent focus:ring-accent focus:ring-offset-zinc-900"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="isFixed" className="text-sm font-medium text-white cursor-pointer">
                  Travar Dados e Habilitar Repostagem
                </label>
                <p className="text-xs text-zinc-400 mt-1">
                  Protege este produto contra atualizações automáticas do robô (imagem e links serão preservados). 
                  Quando o robô detectar este produto novamente nas ofertas, ele será repostado no Telegram automaticamente com a imagem e os links definidos acima.
                </p>
              </div>
            </div>
          </div>

          {/* Botões do Modal */}
          <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6">
            {isPending ? (
              // Modo de moderação para produto pendente
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleSaveWithStatus('active', e)}
                    disabled={loading || telegramLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-650 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Check size={18} weight="bold" />
                    Aprovar no Site
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleTelegramAction('publish', e)}
                    disabled={loading || telegramLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 text-black px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                  >
                    {telegramLoading === 'publish' ? (
                      "Publicando..."
                    ) : (
                      <>
                        <TelegramLogo size={18} weight="bold" />
                        Aprovar e Enviar Telegram
                      </>
                    )}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleTelegramAction('moderate', e)}
                    disabled={loading || telegramLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-lg font-medium transition-colors text-sm border border-zinc-700"
                  >
                    {telegramLoading === 'moderate' ? (
                      "Enviando..."
                    ) : (
                      <>
                        <PaperPlaneTilt size={18} weight="bold" />
                        Enviar p/ Telegram (Aprovação)
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSaveWithStatus('pending', e)}
                    disabled={loading || telegramLoading !== null}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-lg font-medium transition-colors text-sm border border-zinc-750"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              // Modo padrão de edição / adição
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 text-black px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
