"use client";

import { useState, useEffect } from "react";
import { Ticket, Storefront, MagnifyingGlass, Check, TrendUp, Copy, CaretRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: string;
  platform: string;
  expiresAt: string | null;
  isActive: boolean;
  minPurchaseValue: number | null;
  maxDiscountValue: number | null;
  applicableCategories: string | null;
}

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.platform.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = platformFilter === 'all' || coupon.platform.toLowerCase() === platformFilter.toLowerCase();
    
    return matchesSearch && matchesPlatform && coupon.isActive;
  });

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-32">
      <div className="max-w-[800px] mx-auto px-4 md:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center justify-center gap-3">
            <Ticket size={40} weight="fill" className="text-accent" />
            Central de Cupons
          </h1>
          <p className="text-zinc-400 text-lg">
            Encontre e combine os melhores cupons de desconto
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-10 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <div className="flex-1 relative">
              <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código ou loja..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors md:w-64"
            >
              <option value="all">Todas as plataformas</option>
              <option value="amazon">Amazon</option>
              <option value="mercadolivre">Mercado Livre</option>
              <option value="shopee">Shopee</option>
              <option value="aliexpress">AliExpress</option>
              <option value="magalu">Magazine Luiza</option>
              <option value="kabum">KaBuM!</option>
              <option value="netshoes">Netshoes</option>
            </select>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendUp size={20} weight="bold" className="text-accent" />
              <h2 className="text-xl md:text-2xl font-black text-white">
                Os melhores cupons da semana
              </h2>
            </div>
            <p className="text-zinc-500 text-sm">
              Cupons selecionados para a sua compra!
            </p>
          </div>

          {/* Lista de Cupons */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Ticket size={48} weight="duotone" className="text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">Nenhum cupom encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {filteredCoupons.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  whileHover={{ y: -2 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col p-1 shadow-lg"
                >
                  <div className="p-5 flex gap-4 bg-zinc-900 rounded-t-xl">
                    {/* Logo / Ícone */}
                    <div className="w-16 h-16 flex-shrink-0 bg-white rounded-xl flex items-center justify-center shadow-inner">
                      <Storefront size={32} weight="fill" className="text-zinc-800" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Ticket size={16} weight="fill" className="text-accent" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          Cupom • {coupon.platform}
                        </span>
                      </div>
                      
                      <h3 className="text-white font-bold text-lg md:text-xl leading-tight mb-2 line-clamp-2">
                        {coupon.discount} {coupon.description}
                      </h3>
                      
                      <p className="text-zinc-500 text-sm">
                        {coupon.minPurchaseValue ? `Válido em compras acima de R$ ${coupon.minPurchaseValue}. ` : ''}
                        {coupon.applicableCategories ? `Válido para: ${coupon.applicableCategories}.` : 'Válido para produtos selecionados.'}
                      </p>
                    </div>
                  </div>

                  {/* Linha Divisória */}
                  <div className="w-full px-5">
                    <div className="h-px bg-zinc-800 w-full mb-4"></div>
                  </div>

                  {/* Botão Inferior (Arrastável) */}
                  <div className="px-5 pb-5">
                    <DraggableCouponButton code={coupon.code} onCopy={handleCopyCoupon} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function DraggableCouponButton({ code, onCopy }: { code: string, onCopy: (c: string) => void }) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    if (!revealed) {
      setRevealed(true);
      onCopy(code);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 50) {
      handleReveal();
    }
  };

  return (
    <div className="relative w-full h-[56px] bg-white rounded-full flex items-center overflow-hidden border-[4px] border-zinc-900 shadow-inner select-none">
      {/* Texto de fundo (código) */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <span className="font-mono text-zinc-900 font-black text-xl tracking-widest uppercase">
          {revealed ? code : (code.length > 3 ? code.substring(0, 3) + '...' : code)}
        </span>
      </div>

      {/* Efeito de blur no lado direito quando escondido */}
      {!revealed && (
        <div className="absolute right-0 top-0 bottom-0 w-[40%] flex items-center justify-center pointer-events-none z-0 bg-white/40 backdrop-blur-[3px] rounded-r-full">
        </div>
      )}

      {revealed && (
         <span className="absolute right-4 text-[10px] md:text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-md z-0 shadow-sm">
           COPIADO
         </span>
      )}

      {/* Capa vermelha (deslizável) */}
      <motion.div
        drag={revealed ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 1 }}
        onDragEnd={handleDragEnd}
        onClick={handleReveal}
        animate={{ x: revealed ? '200%' : '0%' }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="absolute left-0 top-0 bottom-0 w-[65%] bg-[#E62334] rounded-full flex items-center justify-between px-3 md:px-5 shadow-[4px_0_15px_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-10"
      >
        <span className="text-white font-black text-[15px] md:text-lg flex-1 text-center truncate pr-2">
          Pegar Cupom
        </span>
        
        {/* Indicador visual de arraste */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white shadow-sm flex-shrink-0">
          <CaretRight size={18} weight="bold" />
        </div>
      </motion.div>
    </div>
  );
}
