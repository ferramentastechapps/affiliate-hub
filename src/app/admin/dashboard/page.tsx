'use client';

import { useEffect, useState } from 'react';
import { KPICard } from '@/components/admin/ui/KPICard';
import { Package, Clock, MouseSimple, Users } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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
    return <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-2xl border border-zinc-800"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
        <div className="h-96 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
      </div>
    </div>;
  }

  if (error) return <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Visão Geral</h1>
        <p className="text-zinc-400 mt-2">Métricas e performance da sua plataforma Economizei.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard title="Total Produtos" value={data.products.total} icon={Package} color="indigo" />
        <KPICard title="Pendentes" value={data.products.pending} icon={Clock} color="amber" />
        <KPICard title="Cliques Hoje" value={data.clicks.today} icon={MouseSimple} color="emerald" />
        <KPICard title="Cliques no Mês" value={data.clicks.thisMonth} icon={MouseSimple} color="blue" />
        <KPICard title="Total Usuários" value={data.users.total} icon={Users} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Cliques Diários (30 dias)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.clicksByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line type="monotone" dataKey="clicks" stroke="#818cf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#818cf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-zinc-100 mb-6">Top 10 Produtos (Cliques)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 20) + '...'} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                  itemStyle={{ color: '#34d399' }}
                />
                <Bar dataKey="clicks" fill="#34d399" radius={[0, 4, 4, 0]}>
                  {data.topProducts.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#10b981' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
