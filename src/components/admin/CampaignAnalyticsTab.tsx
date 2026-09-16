"use client";

import { useEffect, useState } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { 
  PaperPlaneTilt, 
  CursorClick, 
  TrendUp, 
  Users, 
  CheckCircle, 
  WarningCircle, 
  BellRinging, 
  PaperPlaneRight, 
  ChatCircleText, 
  ArrowClockwise,
  Sparkle
} from "@phosphor-icons/react";

interface AnalyticsData {
  summary: {
    totalCampaigns: number;
    totalSent: number;
    totalTargets: number;
    totalFailed: number;
    totalClicks24h: number;
    totalClicks7d: number;
    overallCtr: number;
    deliveryRate: number;
  };
  channelStats: {
    push: number;
    telegram: number;
    whatsapp: number;
    website: number;
    outros: number;
  };
  hourlyChartData: Array<{
    hour: string;
    clicks: number;
    push: number;
    telegram: number;
    whatsapp: number;
  }>;
  campaignPerformances: Array<{
    id: string;
    title: string;
    channel: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
    totalTargets: number;
    totalSent: number;
    totalFailed: number;
    estimatedClicks: number;
    ctr: number;
  }>;
}

const CHANNEL_ICON_MAP: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  push: { icon: BellRinging, color: "text-teal-400 bg-teal-500/10 border-teal-500/20", label: "Web Push" },
  telegram: { icon: PaperPlaneRight, color: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "Telegram" },
  whatsapp: { icon: ChatCircleText, color: "text-green-400 bg-green-500/10 border-green-500/20", label: "WhatsApp" },
};

export function CampaignAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch("/api/admin/campaigns/analytics")
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          setData(json);
        }
      })
      .catch((err) => console.error("Erro ao carregar analytics:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-900/80 border border-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-zinc-900/80 border border-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, channelStats, hourlyChartData, campaignPerformances } = data;
  const totalChannelClicks = Math.max(1, (channelStats.push + channelStats.telegram + channelStats.whatsapp));

  return (
    <div className="flex flex-col gap-8">
      {/* Botão de Atualizar e Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Métricas de Conversão de Campanhas
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Tempo Real
            </span>
          </h3>
          <p className="text-xs text-zinc-400">
            Acompanhe a entrega de mensagens, taxa de clique (CTR) e engajamento por canal
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-all hover:text-white"
        >
          <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Enviado */}
        <div className="bg-zinc-900/90 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Disparado</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <PaperPlaneTilt size={20} weight="fill" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white leading-tight">
              {summary.totalSent.toLocaleString("pt-BR")}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">
              {summary.totalCampaigns} campanhas criadas
            </span>
          </div>
        </div>

        {/* Card 2: Alcance / Delivery Rate */}
        <div className="bg-zinc-900/90 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Taxa de Entrega</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle size={20} weight="fill" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white leading-tight">
              {summary.deliveryRate}%
            </span>
            <span className="text-xs text-zinc-500 block mt-1">
              {summary.totalFailed} falhas registradas
            </span>
          </div>
        </div>

        {/* Card 3: Cliques 24h */}
        <div className="bg-zinc-900/90 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Cliques (Últimas 24h)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CursorClick size={20} weight="fill" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white leading-tight">
              {summary.totalClicks24h.toLocaleString("pt-BR")}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">
              {summary.totalClicks7d.toLocaleString("pt-BR")} nos últimos 7 dias
            </span>
          </div>
        </div>

        {/* Card 4: CTR Médio */}
        <div className="bg-zinc-900/90 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">CTR Médio Estimado</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendUp size={20} weight="fill" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-white leading-tight">
              {summary.overallCtr}%
            </span>
            <span className="text-xs text-zinc-500 block mt-1">
              Taxa de conversão em cliques
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Cliques nas Últimas 24 Horas + Breakdown por Canal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-white">Cliques por Hora (Últimas 24h)</h4>
              <p className="text-xs text-zinc-400">Distribuição temporal de tráfego gerado por alertas</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="hour" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value} cliques`, "Total"]}
                  labelFormatter={(label) => `Horário: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#d946ef"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#clickGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Canal */}
        <div className="bg-zinc-900/90 border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white mb-1">Distribuição por Canal</h4>
            <p className="text-xs text-zinc-400 mb-6">Participação de cliques nos últimos 7 dias</p>

            <div className="flex flex-col gap-4">
              {/* Push */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-teal-400 flex items-center gap-1.5">
                    <BellRinging size={14} weight="fill" /> Web Push
                  </span>
                  <span className="text-white">
                    {channelStats.push} ({Math.round((channelStats.push / totalChannelClicks) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((channelStats.push / totalChannelClicks) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Telegram */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-sky-400 flex items-center gap-1.5">
                    <PaperPlaneRight size={14} weight="fill" /> Telegram
                  </span>
                  <span className="text-white">
                    {channelStats.telegram} ({Math.round((channelStats.telegram / totalChannelClicks) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((channelStats.telegram / totalChannelClicks) * 100)}%` }}
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-green-400 flex items-center gap-1.5">
                    <ChatCircleText size={14} weight="fill" /> WhatsApp
                  </span>
                  <span className="text-white">
                    {channelStats.whatsapp} ({Math.round((channelStats.whatsapp / totalChannelClicks) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((channelStats.whatsapp / totalChannelClicks) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Total de cliques identificados:</span>
            <span className="font-bold text-white">{summary.totalClicks7d}</span>
          </div>
        </div>
      </div>

      {/* Tabela de Campanhas com CTR */}
      <div className="bg-zinc-900/90 border border-white/5 rounded-3xl p-6 overflow-hidden">
        <div className="mb-4">
          <h4 className="text-base font-bold text-white">Desempenho por Campanha Recente</h4>
          <p className="text-xs text-zinc-400">Métricas consolidadas de alcance, envios e CTR</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Campanha</th>
                <th className="py-3 px-3">Canal</th>
                <th className="py-3 px-3 text-center">Disparos</th>
                <th className="py-3 px-3 text-center">Falhas</th>
                <th className="py-3 px-3 text-center">CTR Estimado</th>
                <th className="py-3 px-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaignPerformances.map((camp) => {
                const chan = CHANNEL_ICON_MAP[camp.channel] || {
                  icon: Sparkle,
                  color: "text-zinc-400 bg-zinc-800",
                  label: camp.channel,
                };
                const ChanIcon = chan.icon;

                return (
                  <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white max-w-[200px] truncate">
                      {camp.title}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold ${chan.color}`}>
                        <ChanIcon size={14} weight="fill" />
                        {chan.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-zinc-200">
                      {camp.totalSent.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={camp.totalFailed > 0 ? "text-red-400 font-bold" : "text-zinc-500"}>
                        {camp.totalFailed}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full font-black text-xs bg-accent/15 text-accent border border-accent/25">
                        {camp.ctr}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500 text-xs">
                      {camp.sentAt ? new Date(camp.sentAt).toLocaleDateString("pt-BR") : "Rascunho"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
