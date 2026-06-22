"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendDown } from "@phosphor-icons/react";

type PricePoint = {
  date: string;
  price: number;
  originalPrice: number | null;
  formattedDate?: string;
};

export function PriceHistoryChart({ productId }: { productId: string }) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/price-history?days=30`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json) && json.length >= 2) {
          // Formatar as datas para exibição curta (ex: 22 Jun)
          const formatted = json.map((p) => {
            const [year, month, day] = p.date.split("-");
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const dayStr = dateObj.getDate().toString().padStart(2, "0");
            const monthStr = dateObj.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
            return {
              ...p,
              formattedDate: `${dayStr} ${monthStr}`,
            };
          });
          setData(formatted);

          // Calcular menor preço e preço atual
          const prices = json.map((p) => p.price);
          setMinPrice(Math.min(...prices));
          setCurrentPrice(prices[prices.length - 1]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading price history:", err);
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-black/20 rounded-3xl border border-white/5 animate-pulse">
        <span className="text-zinc-500 text-sm">Carregando histórico de preços...</span>
      </div>
    );
  }

  // Se menos de 2 pontos de dados, não renderiza (produto muito novo)
  if (data.length < 2) {
    return null;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="mt-8 bg-white/5 border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent/20 text-accent rounded-2xl">
            <TrendDown size={24} weight="bold" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white leading-tight">Histórico de Preços</h4>
            <p className="text-xs text-zinc-400">Variação registrada nos últimos 30 dias</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          {minPrice !== null && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-left">Menor Preço</span>
              <span className="text-sm font-black text-emerald-400">{formatCurrency(minPrice)}</span>
            </div>
          )}
          {currentPrice !== null && (
            <div className="bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-xl">
              <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-left">Atual</span>
              <span className="text-sm font-black text-accent">{formatCurrency(currentPrice)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-56 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#71717a" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(v) => `R$ ${v}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "rgba(15, 15, 20, 0.95)", 
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "1rem",
                color: "#fff"
              }}
              labelStyle={{ fontSize: 12, fontWeight: "bold", color: "#a1a1aa" }}
              itemStyle={{ color: "#d946ef", fontSize: 13, fontWeight: "bold" }}
              formatter={(value: any) => [formatCurrency(value), "Preço"]}
              labelFormatter={(label) => `Dia: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#d946ef" 
              strokeWidth={3} 
              dot={{ r: 4, stroke: "#d946ef", strokeWidth: 2, fill: "#0f0f14" }}
              activeDot={{ r: 6, stroke: "#d946ef", strokeWidth: 2, fill: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
