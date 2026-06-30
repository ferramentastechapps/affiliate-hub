'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CursorClick, ChartLineUp, Lightning, MegaphoneSimple } from '@phosphor-icons/react';

// Recharts carregado somente no cliente para evitar erros de hidratação
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const PIE_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c'];
const DEVICE_COLORS = ['#34d399', '#818cf8', '#f87171'];

function SummaryCard({ title, value, sub, icon: Icon, color }: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <span className="text-zinc-400 text-sm font-medium">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" weight="duotone" />
        </div>
      </div>
      <div>
        <span className="text-2xl font-bold text-zinc-100">{value}</span>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');
  const [channelFilter, setChannelFilter] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (channelFilter) params.set('channel', channelFilter);

    fetch(`/api/admin/analytics/clicks?${params}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setData(d); setError(''); }
        setLoading(false);
      })
      .catch(() => {
        setError('Falha ao carregar analytics');
        setLoading(false);
      });
  }, [period, channelFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const byDay: any[] = data?.byDay ?? [];
  const byChannel: any[] = data?.byChannel ?? [];
  const byDevice: any[] = data?.byDevice ?? [];
  const byProduct: any[] = data?.byProduct ?? [];
  const summary = data?.summary ?? { total: 0, avgPerDay: 0, peakDay: '—', peakClicks: 0, topChannel: '—' };
  const availableChannels: string[] = data?.availableChannels ?? [];

  const formatDate = (val: string) => val.split('-').slice(1).join('/');

  const tooltipStyle = { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' };

  if (loading && !data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-zinc-900 rounded-lg w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-zinc-900 rounded-2xl" />)}
        </div>
        <div className="h-80 bg-zinc-900 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-900 rounded-2xl" />
          <div className="h-80 bg-zinc-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Analytics de Cliques</h1>
          <p className="text-zinc-400 mt-2">Visão aprofundada de conversões e tráfego.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtro de canal */}
          {availableChannels.length > 0 && (
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5"
            >
              <option value="">Todos os canais</option>
              {availableChannels.map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          )}
          {/* Filtro de período */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20">{error}</div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Cliques"
          value={summary.total.toLocaleString('pt-BR')}
          sub="no período selecionado"
          icon={CursorClick}
          color="text-indigo-400 bg-indigo-400/10"
        />
        <SummaryCard
          title="Média por Dia"
          value={summary.avgPerDay.toLocaleString('pt-BR')}
          sub="cliques/dia"
          icon={ChartLineUp}
          color="text-emerald-400 bg-emerald-400/10"
        />
        <SummaryCard
          title="Dia de Pico"
          value={summary.peakClicks.toLocaleString('pt-BR')}
          sub={summary.peakDay ? new Date(summary.peakDay + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
          icon={Lightning}
          color="text-amber-400 bg-amber-400/10"
        />
        <SummaryCard
          title="Canal Principal"
          value={summary.topChannel}
          sub="canal com mais cliques"
          icon={MegaphoneSimple}
          color="text-rose-400 bg-rose-400/10"
        />
      </div>

      {/* Gráfico de linha — cliques por dia */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center text-zinc-400 text-sm">
            Atualizando...
          </div>
        )}
        <h2 className="text-lg font-bold text-zinc-100 mb-6">Cliques no Período</h2>
        {byDay.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatDate} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#818cf8' }} />
                <Line type="monotone" dataKey="clicks" stroke="#818cf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#818cf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-zinc-500 text-sm">
            Nenhum clique no período selecionado.
          </div>
        )}
      </div>

      {/* Pie Charts — por canal e por dispositivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
          {loading && <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 rounded-2xl" />}
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Por Canal</h2>
          {byChannel.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byChannel}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="clicks"
                      nameKey="channel"
                    >
                      {byChannel.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legenda manual com valores absolutos */}
              <div className="flex flex-col gap-2 mt-2">
                {byChannel.map((entry: any, index: number) => (
                  <div key={entry.channel} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-zinc-300 capitalize">{entry.channel}</span>
                    </div>
                    <span className="text-zinc-400 font-medium tabular-nums">
                      {entry.clicks.toLocaleString('pt-BR')}
                      <span className="text-zinc-600 ml-1 text-xs">
                        ({summary.total > 0 ? Math.round((entry.clicks / summary.total) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
              Sem dados de canal.
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
          {loading && <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 rounded-2xl" />}
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Por Dispositivo</h2>
          {byDevice.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byDevice}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="clicks"
                      nameKey="device"
                    >
                      {byDevice.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {byDevice.map((entry: any, index: number) => (
                  <div key={entry.device} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }} />
                      <span className="text-zinc-300 capitalize">{entry.device}</span>
                    </div>
                    <span className="text-zinc-400 font-medium tabular-nums">
                      {entry.clicks.toLocaleString('pt-BR')}
                      <span className="text-zinc-600 ml-1 text-xs">
                        ({summary.total > 0 ? Math.round((entry.clicks / summary.total) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
              Sem dados de dispositivo.
            </div>
          )}
        </div>
      </div>

      {/* Tabela + Bar Chart — Top Produtos */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
        {loading && <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm z-10 rounded-2xl" />}
        <h2 className="text-lg font-bold text-zinc-100 mb-6">Top Produtos no Período</h2>
        {byProduct.length > 0 ? (
          <div className="space-y-8">
            {/* Bar Chart */}
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProduct.slice(0, 15)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} vertical={true} />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => val.length > 25 ? val.substring(0, 25) + '…' : val}
                  />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#818cf8' }} />
                  <Bar dataKey="clicks" fill="#818cf8" radius={[0, 4, 4, 0]}>
                    {byProduct.slice(0, 15).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#6366f1' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela de ranking */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-3 px-2 font-medium w-8">#</th>
                    <th className="text-left py-3 px-2 font-medium">Produto</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Categoria</th>
                    <th className="text-right py-3 px-2 font-medium">Cliques</th>
                    <th className="text-right py-3 px-2 font-medium hidden sm:table-cell">% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((product: any, index: number) => (
                    <tr key={product.productId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-2 text-zinc-500 font-mono text-xs">{index + 1}</td>
                      <td className="py-3 px-2 text-zinc-200 max-w-[200px] sm:max-w-xs truncate">{product.name}</td>
                      <td className="py-3 px-2 text-zinc-400 hidden md:table-cell">{product.category}</td>
                      <td className="py-3 px-2 text-right font-medium tabular-nums text-zinc-100">
                        {product.clicks.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-400 hidden sm:table-cell">
                        {summary.total > 0 ? ((product.clicks / summary.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            Nenhum produto com cliques no período.
          </div>
        )}
      </div>
    </div>
  );
}
