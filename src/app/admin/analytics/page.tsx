'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/clicks?period=${period}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Falha ao carregar analytics');
        setLoading(false);
      });
  }, [period]);

  if (loading && !data) {
    return <div className="animate-pulse space-y-6">
       <div className="h-10 bg-zinc-900 rounded-lg w-48 mb-6"></div>
       <div className="h-80 bg-zinc-900 rounded-2xl"></div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-900 rounded-2xl"></div>
          <div className="h-80 bg-zinc-900 rounded-2xl"></div>
       </div>
    </div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Analytics de Cliques</h1>
          <p className="text-zinc-400 mt-2">Visão aprofundada de conversões e tráfego.</p>
        </div>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20">{error}</div>}

      {data && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
            {loading && <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center text-zinc-400">Atualizando...</div>}
            <h2 className="text-lg font-bold text-zinc-100 mb-6">Cliques no Período</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.byDay}>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
              {loading && <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center"></div>}
              <h2 className="text-lg font-bold text-zinc-100 mb-6">Por Canal</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byChannel}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="clicks"
                      nameKey="channel"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {data.byChannel.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
              {loading && <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center"></div>}
              <h2 className="text-lg font-bold text-zinc-100 mb-6">Por Dispositivo</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byDevice}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="clicks"
                      nameKey="device"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {data.byDevice.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#34d399', '#818cf8', '#f87171'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative">
            {loading && <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center"></div>}
            <h2 className="text-lg font-bold text-zinc-100 mb-6">Top Produtos no Período</h2>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byProduct} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={200} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 30) + '...'} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="clicks" fill="#818cf8" radius={[0, 4, 4, 0]}>
                    {data.byProduct.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#6366f1' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
