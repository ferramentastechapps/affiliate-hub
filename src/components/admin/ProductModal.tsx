"use client";

import { useState, useEffect } from "react";
import { X, MagicWand, TelegramLogo, Check, PaperPlaneTilt, Plus, Trash, ArrowSquareOut, ArrowsLeftRight, Camera, Image as ImageIcon } from "@phosphor-icons/react";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
};

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    subcategory: "",
    platformProductId: "",
    description: "",
    imageUrl: "",
    enhancedImageUrl: "",
    price: "",
    couponLink: "",
    isFixed: false,
  });

  const [uploadingSite, setUploadingSite] = useState(false);
  const [uploadingLifestyle, setUploadingLifestyle] = useState(false);

  const [productLinks, setProductLinks] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para busca de imagem e Telegram (Opção C)
  const [alternativeImages, setAlternativeImages] = useState<any[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [telegramLoading, setTelegramLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAlternativeImages, setShowAlternativeImages] = useState(true);
  const [reprocessStatus, setReprocessStatus] = useState({ aiProcessed: false, affiliateProcessed: false, aiProcessedAt: null as string | null });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [detectingCategory, setDetectingCategory] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "",
        brand: product.brand || "",
        subcategory: product.subcategory || "",
        platformProductId: product.platformProductId || "",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        enhancedImageUrl: product.enhancedImageUrl || "",
        price: product.price?.toString() || "",
        couponLink: product.couponLink || "",
        isFixed: product.isFixed || false,
      });

      setReprocessStatus({
        aiProcessed: product.aiProcessed || false,
        affiliateProcessed: product.affiliateProcessed || false,
        aiProcessedAt: product.aiProcessedAt || null
      });

      if (product.productLinks && product.productLinks.length > 0) {
        setProductLinks(product.productLinks);
      } else {
        const initialLinks: any[] = [];
        const platforms = ["amazon", "mercadoLivre", "shopee", "aliexpress", "tiktok", "magalu", "kabum", "netshoes"];
        const legacy = product.links || {};
        platforms.forEach(p => {
          if (legacy[p]) {
            initialLinks.push({
              platform: p,
              sourceUrl: "",
              affiliateUrl: "",
              generatedAffiliateUrl: legacy[p],
              isActive: true
            });
          }
        });
        setProductLinks(initialLinks);
      }

      if (product.images && product.images.length > 0) {
        setImages(product.images);
      } else if (product.imageUrl) {
        setImages([{ url: product.imageUrl, isPrimary: true }]);
      } else {
        setImages([]);
      }

      setSearchQuery(product.name || "");
      handleSearchImages(product.name || "");
      setShowNewCategoryInput(false);
    } else {
      setFormData({
        name: "",
        category: "",
        brand: "",
        subcategory: "",
        platformProductId: "",
        description: "",
        imageUrl: "",
        enhancedImageUrl: "",
        price: "",
        couponLink: "",
        isFixed: false,
      });
      setProductLinks([]);
      setImages([]);
      setAlternativeImages([]);
      setSearchQuery("");
      setShowNewCategoryInput(false);
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

  async function handleDetectCategory() {
    if (!formData.name) {
      alert("Digite o nome do produto primeiro para detectar a categoria.");
      return;
    }

    setDetectingCategory(true);
    try {
      const res = await fetch("/api/admin/detect-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productName: formData.name,
          description: formData.description,
          url: scrapeUrl || productLinks[0]?.sourceUrl || ""
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.category) {
          setFormData({ ...formData, category: data.category });
        }
      } else {
        alert("Não foi possível detectar a categoria automaticamente.");
      }
    } catch (error) {
      console.error("Erro ao detectar categoria:", error);
      alert("Erro ao detectar categoria.");
    } finally {
      setDetectingCategory(false);
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
        category: data.category || prev.category, // Usa categoria extraída
      }));

      if (data.name) {
        setSearchQuery(data.name);
        handleSearchImages(data.name);
      }

      const getPlatform = (url: string) => {
        if (url.includes("amazon")) return "amazon";
        if (url.includes("mercadolivre")) return "mercadoLivre";
        if (url.includes("shopee")) return "shopee";
        if (url.includes("aliexpress")) return "aliexpress";
        if (url.includes("tiktok")) return "tiktok";
        return null;
      };

      const platform = getPlatform(scrapeUrl);
      if (platform) {
        setProductLinks(prev => {
          const exists = prev.find(p => p.platform === platform);
          if (exists) {
            return prev.map(p => p.platform === platform ? { ...p, sourceUrl: scrapeUrl } : p);
          }
          return [...prev, { platform, sourceUrl: scrapeUrl, affiliateUrl: "", generatedAffiliateUrl: "", isActive: true }];
        });
      }

      setScrapeUrl("");
    } catch (error) {
      alert("Erro ao buscar dados do produto");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setImages(prev => [...prev, { url: data.imageUrl, isPrimary: prev.length === 0 }]);
        if (!formData.imageUrl) {
          setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
        }
      } else {
        alert(data.error || "Erro ao fazer upload da imagem");
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function handleSpecificUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'site' | 'lifestyle') {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'site') setUploadingSite(true);
    else setUploadingLifestyle(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        if (target === 'site') {
          setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
          setImages(prev => {
            if (prev.some(i => i.url === data.imageUrl)) return prev;
            return [...prev, { url: data.imageUrl, isPrimary: prev.length === 0 }];
          });
        } else {
          setFormData(prev => ({ ...prev, enhancedImageUrl: data.imageUrl }));
          setImages(prev => {
            if (prev.some(i => i.url === data.imageUrl)) return prev;
            return [...prev, { url: data.imageUrl, isPrimary: false }];
          });
        }
      } else {
        alert(data.error || "Erro ao fazer upload da imagem");
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      if (target === 'site') setUploadingSite(false);
      else setUploadingLifestyle(false);
      e.target.value = '';
    }
  }

  function swapImages() {
    setFormData(prev => {
      const temp = prev.imageUrl;
      return {
        ...prev,
        imageUrl: prev.enhancedImageUrl,
        enhancedImageUrl: temp
      };
    });
  }

  async function handleReprocess(type: 'ai' | 'affiliate') {
    if (!product?.id) return;
    if (!confirm(`Deseja forçar o reprocessamento de ${type === 'ai' ? 'IA' : 'Links'}? O bot irá atualizar este produto no próximo ciclo.`)) return;

    setLoading(true);
    try {
      const payload = type === 'ai' ? { ai: true } : { affiliate: true };
      const res = await fetch(`/api/products/${product.id}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setReprocessStatus(prev => ({
          ...prev,
          ...(type === 'ai' ? { aiProcessed: false, aiProcessedAt: null } : { affiliateProcessed: false })
        }));
      } else {
        alert("Erro ao solicitar reprocessamento");
      }
    } catch (error) {
      alert("Erro ao solicitar reprocessamento");
    } finally {
      setLoading(false);
    }
  }

  function getPayload(status?: string) {
    const legacyLinks: any = {};
    productLinks.forEach(link => {
      if (link.generatedAffiliateUrl || link.affiliateUrl || link.sourceUrl) {
        legacyLinks[link.platform] = link.generatedAffiliateUrl || link.affiliateUrl || link.sourceUrl;
      }
    });

    const primaryImage = images.find(img => img.isPrimary)?.url || images[0]?.url || formData.imageUrl;

    return {
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      subcategory: formData.subcategory,
      platformProductId: formData.platformProductId,
      description: formData.description,
      imageUrl: formData.imageUrl || primaryImage,
      enhancedImageUrl: formData.enhancedImageUrl || null,
      price: formData.price ? parseFloat(formData.price) : null,
      couponLink: formData.couponLink || null,
      status: status,
      isFixed: formData.isFixed,
      links: legacyLinks,
      productLinks: productLinks,
      images: images.map((img, idx) => ({ ...img, order: idx }))
    };
  }

  async function handleSaveWithStatus(status: 'active' | 'pending' | 'approved', e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Salva os dados do produto (nome, links, imagens, etc.)
      const payload = getPayload(status);
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const saveRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        alert("Erro ao salvar produto");
        return;
      }

      // Se for aprovação (status active), usa o endpoint silencioso.
      // NÃO dispara Telegram nem push — a fila do bot cuida disso.
      if (status === 'active' && product?.id) {
        await fetch(`/api/admin/products/${product.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        });
      }

      onClose();
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
      const payload = getPayload(action === 'publish' ? 'active' : undefined);
      
      const saveRes = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        throw new Error("Falha ao salvar produto antes de enviar ao Telegram");
      }

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
      const payload = getPayload();
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

  function addLink() {
    setProductLinks([...productLinks, { platform: "", sourceUrl: "", affiliateUrl: "", generatedAffiliateUrl: "", isActive: true }]);
  }

  function updateLink(index: number, field: string, value: any) {
    const newLinks = [...productLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setProductLinks(newLinks);
  }

  function removeLink(index: number) {
    setProductLinks(productLinks.filter((_, i) => i !== index));
  }

  function setPrimaryImage(index: number) {
    const newImages = images.map((img, i) => ({ ...img, isPrimary: i === index }));
    setImages(newImages);
    setFormData(prev => ({ ...prev, imageUrl: newImages[index].url }));
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    if (newImages.length > 0 && images[index]?.isPrimary) {
      newImages[0].isPrimary = true;
      setFormData(prev => ({ ...prev, imageUrl: newImages[0].url }));
    }
    setImages(newImages);
  }

  if (!isOpen) return null;

  const isPending = product && product.status === "pending";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
      <div className="bg-zinc-900 sm:border border-zinc-800 sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              {product ? (isPending ? "Moderar Produto Pendente" : "Editar Produto") : "Adicionar Produto"}
            </h2>
            {isPending && (
              <span className="text-xs text-amber-400 font-medium">Aguardando aprovação</span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Nome *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Categoria *</label>
              {!showNewCategoryInput ? (
                <div className="flex gap-2">
                  <select required value={formData.category} onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setShowNewCategoryInput(true);
                      setFormData({ ...formData, category: "" });
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm">
                    <option value="">Selecione...</option>
                    <option value="Air Fryers">Air Fryers</option>
                    <option value="Ar Condicionado">Ar Condicionado</option>
                    <option value="Aspiradores">Aspiradores</option>
                    <option value="Automotivo">Automotivo</option>
                    <option value="Bebês e Crianças">Bebês e Crianças</option>
                    <option value="Bicicletas e Esporte">Bicicletas e Esporte</option>
                    <option value="Bolsas e Acessórios">Bolsas e Acessórios</option>
                    <option value="Cafeteiras">Cafeteiras</option>
                    <option value="Café e Bebidas">Café e Bebidas</option>
                    <option value="Caixas de Som">Caixas de Som</option>
                    <option value="Câmeras">Câmeras</option>
                    <option value="Casa e Eletrodomésticos">Casa e Eletrodomésticos</option>
                    <option value="Cervejas e Vinhos">Cervejas e Vinhos</option>
                    <option value="Chocolates e Doces">Chocolates e Doces</option>
                    <option value="Consoles e Games">Consoles e Games</option>
                    <option value="Diversos">Diversos</option>
                    <option value="Esporte e Suplementos">Esporte e Suplementos</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Ferramentas e Jardim">Ferramentas e Jardim</option>
                    <option value="Fones de Ouvido">Fones de Ouvido</option>
                    <option value="Geladeiras e Freezers">Geladeiras e Freezers</option>
                    <option value="Informática e Games">Informática e Games</option>
                    <option value="Lavadoras">Lavadoras</option>
                    <option value="Livros e eReaders">Livros e eReaders</option>
                    <option value="Livros, eBooks e eReaders">Livros, eBooks e eReaders</option>
                    <option value="Maquiagem e Pele">Maquiagem e Pele</option>
                    <option value="Micro-ondas">Micro-ondas</option>
                    <option value="Moda e Acessórios">Moda e Acessórios</option>
                    <option value="Monitores">Monitores</option>
                    <option value="Notebooks">Notebooks</option>
                    <option value="PCs e Desktops">PCs e Desktops</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="Periféricos">Periféricos</option>
                    <option value="Pet">Pet</option>
                    <option value="Roupas e Moda">Roupas e Moda</option>
                    <option value="Saúde e Beleza">Saúde e Beleza</option>
                    <option value="Shampoo e Cabelo">Shampoo e Cabelo</option>
                    <option value="Smart TVs">Smart TVs</option>
                    <option value="Smartphones">Smartphones</option>
                    <option value="Smartphones e TV">Smartphones e TV</option>
                    <option value="Smartwatches">Smartwatches</option>
                    <option value="SSD, HDs e Memória">SSD, HDs e Memória</option>
                    <option value="Supermercado e Delivery">Supermercado e Delivery</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Tênis e Calçados">Tênis e Calçados</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Whey e Suplementos">Whey e Suplementos</option>
                    <option value="__NEW__" className="text-accent font-semibold">➕ Nova Categoria</option>
                  </select>
                  {formData.category && formData.category !== "Diversos" && (
                    <button type="button" onClick={handleDetectCategory} disabled={detectingCategory} className="bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium whitespace-nowrap" title="Detectar categoria automaticamente">
                      <MagicWand size={16} weight="bold" /> {detectingCategory ? "Detectando..." : "IA"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Digite o nome da nova categoria..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
                  <button type="button" onClick={() => { setShowNewCategoryInput(false); setFormData({ ...formData, category: "" }); }} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg transition-colors text-xs">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Subcategoria</label>
              <input type="text" value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Marca</label>
              <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço (R$)</label>
              <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">ID na Plataforma (Opcional)</label>
              <input type="text" value={formData.platformProductId} onChange={(e) => setFormData({ ...formData, platformProductId: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" placeholder="ASIN, MLB-xxx, etc." />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Link do Cupom (Opcional - para resgate sem código)</label>
              <input type="text" value={formData.couponLink} onChange={(e) => setFormData({ ...formData, couponLink: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" placeholder="https://s.shopee.com.br/..." />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Descrição</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm" />
            </div>
          </div>

          {/* Nova Área de Gerenciamento das Duas Fotos Principais */}
          <div className="border-t border-zinc-800 pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Camera size={20} className="text-indigo-400" />
              Imagens do Produto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              {/* Botão de Swap centralizado */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                <button
                  type="button"
                  onClick={swapImages}
                  title="Inverter Imagens (Site <-> Grupo)"
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-full shadow-lg transition active:scale-95"
                >
                  <ArrowsLeftRight size={18} weight="bold" />
                </button>
              </div>

              {/* Coluna 1: Foto do Site */}
              <div className="bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-xl flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5 border-b border-zinc-800/60 pb-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Foto do Site (Fundo Branco)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">Upload de Arquivo</label>
                      <label className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-zinc-300 rounded-lg cursor-pointer transition text-xs font-medium">
                        {uploadingSite ? "Enviando..." : "Selecionar Arquivo"}
                        <input type="file" accept="image/*" onChange={(e) => handleSpecificUpload(e, 'site')} disabled={uploadingSite || uploadingLifestyle} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">URL da Imagem</label>
                      <input
                        type="text"
                        value={formData.imageUrl}
                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-xs outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/80 h-32 flex items-center justify-center relative mt-2">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Site Preview" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                  ) : (
                    <div className="text-zinc-650 flex flex-col items-center gap-1">
                      <ImageIcon size={20} />
                      <span className="text-[10px]">Sem foto do site</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Foto do Grupo */}
              <div className="bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-xl flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5 border-b border-zinc-800/60 pb-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    Foto do Grupo (Lifestyle)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">Upload de Arquivo</label>
                      <label className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-zinc-300 rounded-lg cursor-pointer transition text-xs font-medium">
                        {uploadingLifestyle ? "Enviando..." : "Selecionar Arquivo"}
                        <input type="file" accept="image/*" onChange={(e) => handleSpecificUpload(e, 'lifestyle')} disabled={uploadingSite || uploadingLifestyle} className="hidden" />
                      </label>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">URL da Imagem</label>
                      <input
                        type="text"
                        value={formData.enhancedImageUrl}
                        onChange={e => setFormData({ ...formData, enhancedImageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-xs outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/80 h-32 flex items-center justify-center relative mt-2">
                  {formData.enhancedImageUrl ? (
                    <img src={formData.enhancedImageUrl} alt="Group Preview" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                  ) : (
                    <div className="text-zinc-650 flex flex-col items-center gap-1">
                      <ImageIcon size={20} />
                      <span className="text-[10px]">Sem foto lifestyle</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Swap visível apenas em Mobile */}
              <div className="col-span-1 md:hidden flex justify-center mt-1">
                <button
                  type="button"
                  onClick={swapImages}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
                >
                  <ArrowsLeftRight size={14} /> Inverter Imagens
                </button>
              </div>
            </div>
          </div>

          {/* Galeria de imagens */}
          <div className="border-t border-zinc-800 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Galeria de Imagens</h3>
              <label className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer px-3 py-1.5 rounded-lg font-medium transition-colors text-xs">
                {uploadingImage ? "Enviando..." : "Adicionar Imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
            
            {images.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${formData.imageUrl === img.url ? 'border-emerald-500' : formData.enhancedImageUrl === img.url ? 'border-indigo-500' : 'border-zinc-800'}`}>
                    <img src={img.url} alt="Galeria" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: img.url }))} className="w-full py-0.5 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                        Usar no Site
                      </button>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, enhancedImageUrl: img.url }))} className="w-full py-0.5 text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium">
                        Usar no Grupo
                      </button>
                      <button type="button" onClick={() => removeImage(idx)} className="w-full py-0.5 text-[9px] bg-red-900/40 hover:bg-red-900 text-red-300 rounded font-medium">
                        Remover
                      </button>
                    </div>
                    {formData.imageUrl === img.url && <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded">Site</span>}
                    {formData.enhancedImageUrl === img.url && <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[8px] font-bold px-1 rounded">Grupo</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Nenhuma imagem na galeria. Use o upload ou busque alternativas.</p>
            )}
          </div>

          {/* Grade de Imagens Alternativas */}
          <div className="bg-zinc-850/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">Imagens Alternativas</span>
              <div className="flex items-center gap-3">
                {searchingImages && <span className="text-xs text-accent animate-pulse">Buscando imagens...</span>}
                <button type="button" onClick={() => setShowAlternativeImages(!showAlternativeImages)} className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-600 underline-offset-2">
                  {showAlternativeImages ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {showAlternativeImages && (
              <>
                {alternativeImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1.5 bg-zinc-950/70 border border-zinc-800 rounded-lg">
                    {alternativeImages.map((img, idx) => (
                      <div key={idx} className="aspect-square relative rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 group transition-all hover:scale-[1.03]">
                        <img src={img.thumbnail || img.image} alt={img.title || "Imagem alternativa"} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.webp"; }} />
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-center justify-center p-1">
                          <button type="button" onClick={() => {
                            if (!images.some(i => i.url === img.image)) {
                              setImages(prev => [...prev, { url: img.image, isPrimary: false }]);
                            }
                            setFormData(prev => ({ ...prev, imageUrl: img.image }));
                          }} className="w-full py-0.5 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                            Usar no Site
                          </button>
                          <button type="button" onClick={() => {
                            if (!images.some(i => i.url === img.image)) {
                              setImages(prev => [...prev, { url: img.image, isPrimary: false }]);
                            }
                            setFormData(prev => ({ ...prev, enhancedImageUrl: img.image }));
                          }} className="w-full py-0.5 text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium">
                            Usar no Grupo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Palavra-chave para buscar..." className="flex-1 bg-zinc-900 text-xs border border-zinc-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => handleSearchImages(searchQuery)} disabled={searchingImages || !searchQuery} className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-xs text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Buscar</button>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Links do Produto</h3>
              <button type="button" onClick={addLink} className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            
            <div className="space-y-4">
              {productLinks.map((link, idx) => (
                <div key={idx} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 relative">
                  <button type="button" onClick={() => removeLink(idx)} className="absolute top-3 right-3 text-zinc-500 hover:text-red-400">
                    <Trash size={16} />
                  </button>
                  <div className="grid grid-cols-2 gap-3 pr-6">
                    <div>
                      <label className="block text-[10px] uppercase text-zinc-500 mb-1">Plataforma</label>
                      <select value={link.platform} onChange={e => updateLink(idx, 'platform', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm">
                        <option value="">Selecione...</option>
                        <option value="amazon">Amazon</option>
                        <option value="mercadoLivre">Mercado Livre</option>
                        <option value="shopee">Shopee</option>
                        <option value="aliexpress">AliExpress</option>
                        <option value="tiktok">TikTok</option>
                        <option value="magalu">Magalu</option>
                        <option value="kabum">KaBuM!</option>
                        <option value="netshoes">Netshoes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-zinc-500 mb-1">URL Original (Source)</label>
                      <div className="flex items-center gap-1">
                        <input type="url" value={link.sourceUrl || ''} onChange={e => updateLink(idx, 'sourceUrl', e.target.value)} placeholder="https://..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm" />
                        {link.sourceUrl && (
                          <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" title="Abrir link original" className="text-zinc-400 hover:text-accent transition-colors shrink-0 p-1">
                            <ArrowSquareOut size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-zinc-500 mb-1">URL Afiliado (Parceiro)</label>
                      <div className="flex items-center gap-1">
                        <input type="url" value={link.affiliateUrl || ''} onChange={e => updateLink(idx, 'affiliateUrl', e.target.value)} placeholder="https://..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm" />
                        {link.affiliateUrl && (
                          <a href={link.affiliateUrl} target="_blank" rel="noopener noreferrer" title="Abrir link de afiliado" className="text-zinc-400 hover:text-accent transition-colors shrink-0 p-1">
                            <ArrowSquareOut size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-zinc-500 mb-1">URL Gerada (Bot)</label>
                      <div className="flex items-center gap-1">
                        <input type="url" value={link.generatedAffiliateUrl || ''} onChange={e => updateLink(idx, 'generatedAffiliateUrl', e.target.value)} placeholder="https://..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm" />
                        {link.generatedAffiliateUrl && (
                          <a href={link.generatedAffiliateUrl} target="_blank" rel="noopener noreferrer" title="Abrir URL gerada" className="text-zinc-400 hover:text-accent transition-colors shrink-0 p-1">
                            <ArrowSquareOut size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {productLinks.length === 0 && <p className="text-sm text-zinc-500 italic">Nenhum link cadastrado.</p>}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 p-4 rounded-xl">
              <div className="flex items-center h-5">
                <input id="isFixed" type="checkbox" checked={formData.isFixed} onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-accent focus:ring-accent focus:ring-offset-zinc-900" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="isFixed" className="text-sm font-medium text-white cursor-pointer">Travar Dados e Habilitar Repostagem</label>
                <p className="text-xs text-zinc-400 mt-1">
                  Protege este produto contra atualizações automáticas do robô.
                </p>
              </div>
            </div>
          </div>

          {product && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-semibold mb-4">Reprocessamento Avançado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Processamento de IA</h4>
                    <p className="text-xs text-zinc-400 mb-3">
                      Status: {reprocessStatus.aiProcessed 
                        ? <span className="text-emerald-400 font-medium">Processado ({reprocessStatus.aiProcessedAt ? new Date(reprocessStatus.aiProcessedAt).toLocaleDateString('pt-BR') : 'Sem data'})</span> 
                        : <span className="text-amber-400 font-medium">Pendente</span>}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleReprocess('ai')} 
                    disabled={!reprocessStatus.aiProcessed || loading}
                    className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 px-3 py-2 rounded-lg font-medium transition-colors border border-zinc-700"
                  >
                    Reprocessar IA
                  </button>
                </div>
                
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Links de Afiliados</h4>
                    <p className="text-xs text-zinc-400 mb-3">
                      Status: {reprocessStatus.affiliateProcessed 
                        ? <span className="text-emerald-400 font-medium">Gerados</span> 
                        : <span className="text-amber-400 font-medium">Pendentes</span>}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleReprocess('affiliate')} 
                    disabled={!reprocessStatus.affiliateProcessed || loading}
                    className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 px-3 py-2 rounded-lg font-medium transition-colors border border-zinc-700"
                  >
                    Regenerar Links
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botões do Modal */}
          <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6">
            {isPending ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button type="button" onClick={(e) => handleSaveWithStatus('active', e)} disabled={loading || telegramLoading !== null} className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-650 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm">
                    <Check size={18} weight="bold" /> Aprovar no Site
                  </button>
                  <button type="button" onClick={(e) => handleTelegramAction('publish', e)} disabled={loading || telegramLoading !== null} className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 text-black px-4 py-3 rounded-lg font-medium transition-colors text-sm">
                    {telegramLoading === 'publish' ? "Publicando..." : <><TelegramLogo size={18} weight="bold" /> Aprovar e Enviar Telegram</>}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={(e) => handleTelegramAction('moderate', e)} disabled={loading || telegramLoading !== null} className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-lg font-medium transition-colors text-sm border border-zinc-700">
                    {telegramLoading === 'moderate' ? "Enviando..." : <><PaperPlaneTilt size={18} weight="bold" /> Enviar p/ Telegram (Aprovação)</>}
                  </button>
                  <button type="button" onClick={(e) => handleSaveWithStatus('pending', e)} disabled={loading || telegramLoading !== null} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-lg font-medium transition-colors text-sm border border-zinc-750">
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-lg font-medium transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90 disabled:bg-zinc-700 text-black px-4 py-3 rounded-lg font-medium transition-colors text-sm">
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
