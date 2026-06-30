"use client";

import { useState, useEffect } from "react";
import { Ticket, Storefront, MagnifyingGlass, Check, TrendUp, Copy } from "@phosphor-icons/react";
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
                      
                      <h3 className="text-white font-bold text-lg md:text-xl leading-tight mb-2">
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

                  {/* Botão Inferior */}
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className="w-full relative h-[56px] bg-[#E62334] text-white font-black rounded-full flex items-center hover:bg-[#d01f2f] transition-all overflow-hidden group shadow-lg shadow-accent/20"
                    >
                      <span className="flex-1 text-center text-lg pr-[120px]">
                        {copiedCode === coupon.code ? 'COPIADO!' : 'Pegar Cupom'}
                      </span>
                      
                      {/* Área do código vazada (simulando corte) */}
                      <div className="absolute right-[-4px] top-[-4px] bottom-[-4px] w-[140px] bg-white rounded-full flex items-center justify-center border-[6px] border-zinc-900 group-hover:bg-zinc-100 transition-colors">
                        <span className="font-mono text-zinc-800 font-black text-xl blur-[3px] select-none uppercase tracking-widest">
                          {coupon.code.substring(0, 4)}...
                        </span>
                      </div>
                    </button>
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
