'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { KPICard } from '@/components/admin/ui/KPICard';
import { Package, Clock, Users, TrendUp, CheckCircle, ChartPieSlice } from '@phosphor-icons/react';

// Recharts deve ser carregado apenas no cliente (sem SSR) para evitar erros de hidratação
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  active: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border border-amber-500/20',
  active: 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20',
  rejected: 'text-red-400 bg-red-400/10 border border-red-500/20',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Falha ao carregar dashboard');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded-lg w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-zinc-900 rounded-2xl border border-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800" />
        </div>
        <div className="h-64 bg-zinc-900 rounded-2xl border border-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20">
        {error}
      </div>
    );
  }

  const clicksByDay: any[] = data?.clicksByDay ?? [];
  const topProducts: any[] = data?.topProducts ?? [];
  const recentProducts: any[] = data?.recentProducts ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Visão Geral</h1>
        <p className="text-zinc-400 mt-2">Métricas e performance da plataforma Economizei.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Produtos"
          value={data?.products?.total ?? 0}
          icon={Package}
          color="indigo"
        />
        <KPICard
          title="Aprovados"
          value={data?.products?.approved ?? 0}
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Pendentes"
          value={data?.products?.pending ?? 0}
          icon={Clock}
          color="amber"
        />
        <KPICard
          title="Cliques Hoje"
          value={data?.clicks?.today ?? 0}
          icon={TrendUp}
          color="blue"
          trend={
            data?.clicks?.todayTrend !== undefined
              ? { value: Math.abs(data.clicks.todayTrend), isPositive: data.clicks.todayTrend >= 0 }
              : undefined
          }
        />
        <KPICard
          title="Cliques no Mês"
          value={data?.clicks?.thisMonth ?? 0}
          icon={ChartPieSlice}
          color="indigo"
          trend={
            data?.clicks?.monthTrend !== undefined
              ? { value: Math.abs(data.clicks.monthTrend), isPositive: data.clicks.monthTrend >= 0 }
              : undefined
          }
        />
        <KPICard
          title="Total Usuários"
          value={data?.users?.total ?? 0}
          icon={Users}
          color="rose"
          trend={
            data?.users?.weekTrend !== undefined
              ? { value: Math.abs(data.users.weekTrend), isPositive: data.users.weekTrend >= 0 }
              : undefined
          }
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart — Cliques por dia */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Cliques Diários (30 dias)</h2>
          {clicksByDay.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clicksByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="#818cf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#818cf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-zinc-500 text-sm">
              Nenhum clique registrado nos últimos 30 dias.
            </div>
          )}
        </div>

        {/* Bar Chart — Top Produtos */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Top 10 Produtos (Cliques)</h2>
          {topProducts.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} vertical={true} />
                  <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => val.length > 18 ? val.substring(0, 18) + '…' : val}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                    itemStyle={{ color: '#34d399' }}
                  />
                  <Bar dataKey="clicks" fill="#34d399" radius={[0, 4, 4, 0]}>
                    {topProducts.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#10b981' : '#34d399'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-zinc-500 text-sm">
              Nenhum produto com cliques registrados.
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Produtos Recentes */}
      {recentProducts.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-100">Produtos Recentes</h2>
            <p className="text-zinc-500 text-sm mt-1">Últimos 8 produtos adicionados ao sistema.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="text-left px-6 py-3 font-medium">Produto</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Categoria</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">Adicionado</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((product: any) => (
                  <tr key={product.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 bg-zinc-800"
                            onError={(e: any) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <span className="text-zinc-200 truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-zinc-400 hidden md:table-cell">{product.category}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[product.status] ?? 'text-zinc-400'}`}>
                        {STATUS_LABELS[product.status] ?? product.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-500 hidden lg:table-cell">
                      {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
