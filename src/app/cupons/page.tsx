"use client";

import { useState, useEffect } from "react";
import { Calculator, Tag, Copy, Check, Percent, CurrencyCircleDollar, TrendUp, Ticket } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: string;
  platform: string;
  expiresAt: string | null;
  isActive: boolean;
}

type Platform = 'amazon' | 'mercadolivre' | 'shopee' | 'aliexpress' | 'magalu' | 'outros';

const platformRules: Record<Platform, { name: string; canStack: string[]; info: string }> = {
  amazon: {
    name: 'Amazon',
    canStack: ['cupom', 'pagamento'],
    info: 'Cupom + método de pagamento acumulam'
  },
  mercadolivre: {
    name: 'Mercado Livre',
    canStack: ['cupom', 'pix'],
    info: 'Cupom + Pix acumulam'
  },
  shopee: {
    name: 'Shopee',
    canStack: ['cupom', 'vendedor', 'moedas'],
    info: 'Cupom site + cupom vendedor + moedas acumulam (moedas têm limite)'
  },
  aliexpress: {
    name: 'AliExpress',
    canStack: ['cupom', 'moedas'],
    info: 'Cupom + moedas acumulam'
  },
  magalu: {
    name: 'Magazine Luiza',
    canStack: ['cupom', 'pagamento'],
    info: 'Cupom + método de pagamento acumulam'
  },
  outros: {
    name: 'Outros',
    canStack: ['cupom'],
    info: 'Apenas cupom único'
  }
};

type PaymentMethod = 'normal' | 'pix' | 'cartao';

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Calculadora de cupons
  const [calcPrice, setCalcPrice] = useState<string>('');
  const [calcPlatform, setCalcPlatform] = useState<Platform>('amazon');
  const [calcCouponSite, setCalcCouponSite] = useState<string>('');
  const [calcCouponSiteType, setCalcCouponSiteType] = useState<'percent' | 'fixed'>('percent');
  const [calcCouponVendor, setCalcCouponVendor] = useState<string>('');
  const [calcCouponVendorType, setCalcCouponVendorType] = useState<'percent' | 'fixed'>('percent');
  const [calcPaymentMethod, setCalcPaymentMethod] = useState<PaymentMethod>('normal');
  const [calcShipping, setCalcShipping] = useState<string>('0');
  const [calcFreeShipping, setCalcFreeShipping] = useState(false);

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

  const calculateDiscount = () => {
    const price = parseFloat(calcPrice) || 0;
    if (price === 0) return null;

    let currentPrice = price;
    const breakdown: { label: string; value: number }[] = [];

    // 1. Cupom do site
    if (calcCouponSite) {
      const couponValue = parseFloat(calcCouponSite) || 0;
      if (calcCouponSiteType === 'percent') {
        const discount = currentPrice * (couponValue / 100);
        currentPrice -= discount;
        breakdown.push({ label: `Cupom Site (${couponValue}%)`, value: -discount });
      } else {
        currentPrice -= couponValue;
        breakdown.push({ label: `Cupom Site`, value: -couponValue });
      }
    }

    // 2. Cupom do vendedor (só Shopee)
    if (calcPlatform === 'shopee' && calcCouponVendor) {
      const couponValue = parseFloat(calcCouponVendor) || 0;
      if (calcCouponVendorType === 'percent') {
        const discount = currentPrice * (couponValue / 100);
        currentPrice -= discount;
        breakdown.push({ label: `Cupom Vendedor (${couponValue}%)`, value: -discount });
      } else {
        currentPrice -= couponValue;
        breakdown.push({ label: `Cupom Vendedor`, value: -couponValue });
      }
    }

    // 3. Método de pagamento
    if (calcPaymentMethod === 'pix') {
      const discount = currentPrice * 0.05;
      currentPrice -= discount;
      breakdown.push({ label: 'Pix (5%)', value: -discount });
    } else if (calcPaymentMethod === 'cartao') {
      const discount = currentPrice * 0.10;
      currentPrice -= discount;
      breakdown.push({ label: 'Cartão Especial (10%)', value: -discount });
    }

    // 4. Frete
    if (!calcFreeShipping) {
      const shipping = parseFloat(calcShipping) || 0;
      currentPrice += shipping;
      breakdown.push({ label: 'Frete', value: shipping });
    }

    const totalSavings = price - currentPrice + (calcFreeShipping ? 0 : parseFloat(calcShipping) || 0);
    const savingsPercent = (totalSavings / price) * 100;

    return {
      originalPrice: price,
      finalPrice: Math.max(0, currentPrice),
      totalSavings,
      savingsPercent,
      breakdown
    };
  };

  const result = calculateDiscount();

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.platform.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = platformFilter === 'all' || coupon.platform.toLowerCase() === platformFilter.toLowerCase();
    
    return matchesSearch && matchesPlatform && coupon.isActive;
  });

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffHours = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 24;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pt-20 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-3">
            <Ticket size={40} weight="duotone" className="text-accent" />
            Cupons & Calculadora
          </h1>
          <p className="text-text-secondary text-lg">
            Combine cupons e calcule o melhor preço final
          </p>
        </motion.div>

        {/* SEÇÃO 1 — CALCULADORA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-glass-bg border border-glass-border rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calculator size={32} weight="duotone" className="text-accent" />
            <h2 className="text-2xl font-black text-white">Calculadora de Descontos</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Formulário */}
            <div className="space-y-4">
              {/* Plataforma */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Plataforma</label>
                <select
                  value={calcPlatform}
                  onChange={(e) => setCalcPlatform(e.target.value as Platform)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                >
                  {Object.entries(platformRules).map(([key, { name }]) => (
                    <option key={key} value={key} className="bg-zinc-900">{name}</option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  {platformRules[calcPlatform].info}
                </p>
              </div>

              {/* Preço Original */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Preço Original (R$)</label>
                <input
                  type="number"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              {/* Cupom do Site */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Cupom da Plataforma</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={calcCouponSite}
                    onChange={(e) => setCalcCouponSite(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                  />
                  <select
                    value={calcCouponSiteType}
                    onChange={(e) => setCalcCouponSiteType(e.target.value as 'percent' | 'fixed')}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                  >
                    <option value="percent" className="bg-zinc-900">%</option>
                    <option value="fixed" className="bg-zinc-900">R$</option>
                  </select>
                </div>
              </div>

              {/* Cupom do Vendedor (só Shopee) */}
              {calcPlatform === 'shopee' && (
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Cupom do Vendedor</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={calcCouponVendor}
                      onChange={(e) => setCalcCouponVendor(e.target.value)}
                      placeholder="0"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                    />
                    <select
                      value={calcCouponVendorType}
                      onChange={(e) => setCalcCouponVendorType(e.target.value as 'percent' | 'fixed')}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                    >
                      <option value="percent" className="bg-zinc-900">%</option>
                      <option value="fixed" className="bg-zinc-900">R$</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Método de Pagamento */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Método de Pagamento</label>
                <select
                  value={calcPaymentMethod}
                  onChange={(e) => setCalcPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                >
                  <option value="normal" className="bg-zinc-900">Normal</option>
                  <option value="pix" className="bg-zinc-900">Pix (-5%)</option>
                  <option value="cartao" className="bg-zinc-900">Cartão Especial (-10%)</option>
                </select>
              </div>

              {/* Frete */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={calcFreeShipping}
                    onChange={(e) => setCalcFreeShipping(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm font-bold text-white">Frete Grátis</span>
                </label>
                {!calcFreeShipping && (
                  <input
                    type="number"
                    value={calcShipping}
                    onChange={(e) => setCalcShipping(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                  />
                )}
              </div>
            </div>

            {/* Resultado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-black text-white mb-4">Resultado</h3>
              
              {result ? (
                <div className="space-y-4">
                  {/* Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Preço Original</span>
                      <span className="text-white font-bold">R$ {result.originalPrice.toFixed(2)}</span>
                    </div>
                    {result.breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className={`font-bold ${item.value < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.value < 0 ? '-' : '+'} R$ {Math.abs(item.value).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-bold">Preço Final</span>
                      <span className="text-2xl font-black text-accent">
                        R$ {result.finalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                      <span className="text-green-400 text-sm font-bold flex items-center gap-2">
                        <TrendUp size={18} weight="bold" />
                        Economia Total
                      </span>
                      <span className="text-green-400 font-black">
                        R$ {result.totalSavings.toFixed(2)} ({result.savingsPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-center py-8">
                  Preencha o preço para ver o cálculo
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* SEÇÃO 2 — LISTA DE CUPONS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Tag size={32} weight="duotone" className="text-accent" />
              Cupons Ativos
            </h2>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código ou loja..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-text-secondary outline-none focus:border-accent/50 transition-colors"
            />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors md:w-48"
            >
              <option value="all" className="bg-zinc-900">Todas as plataformas</option>
              <option value="amazon" className="bg-zinc-900">Amazon</option>
              <option value="mercadolivre" className="bg-zinc-900">Mercado Livre</option>
              <option value="shopee" className="bg-zinc-900">Shopee</option>
              <option value="aliexpress" className="bg-zinc-900">AliExpress</option>
              <option value="magalu" className="bg-zinc-900">Magazine Luiza</option>
              <option value="kabum" className="bg-zinc-900">KaBuM</option>
              <option value="netshoes" className="bg-zinc-900">Netshoes</option>
            </select>
          </div>

          {/* Grid de Cupons */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-12 bg-glass-bg border border-glass-border rounded-2xl">
              <Ticket size={48} weight="duotone" className="text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">Nenhum cupom encontrado</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-glass-bg border border-glass-border rounded-xl p-5 relative overflow-hidden"
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-xs font-bold">
                      {coupon.platform}
                    </span>
                    {isExpiringSoon(coupon.expiresAt) && (
                      <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold">
                        Expira hoje!
                      </span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <h3 className="text-white font-bold mb-2 line-clamp-2">{coupon.description}</h3>
                  <p className="text-text-secondary text-sm mb-4">{coupon.discount}</p>

                  {/* Código */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <code className="text-accent font-mono font-bold text-sm">{coupon.code}</code>
                    </div>
                    <button
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className="w-10 h-10 flex items-center justify-center bg-accent hover:bg-accent/80 rounded-lg transition-colors"
                      aria-label="Copiar código"
                    >
                      <AnimatePresence mode="wait">
                        {copiedCode === coupon.code ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check size={18} weight="bold" className="text-white" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Copy size={18} weight="bold" className="text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  {/* Data de Expiração */}
                  {coupon.expiresAt && (
                    <p className="text-xs text-text-secondary mt-2">
                      Expira em: {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
