'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Handshake, 
  Plus, 
  MagnifyingGlass, 
  Trash, 
  PencilSimple, 
  X,
  ChartLineUp,
  Storefront,
  Users,
  Copy,
  CheckCircle,
} from '@phosphor-icons/react';
import { useToastContext } from '@/components/ToastProvider';

interface Partner {
  id: string;
  name: string;
  email: string | null;
  platform: string;
  channelName: string | null;
  trackingCode: string;
  totalClicks: number;
  totalRevenue: number;
  commissionRate: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

const PLATFORMS = ['Amazon', 'Mercado Livre', 'Magalu', 'Shopee', 'Outro'];

export default function PartnersPage() {
  const toast = useToastContext();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, totalRevenue: 0 });
  
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [channelName, setChannelName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [commissionRate, setCommissionRate] = useState('0');
  const [notes, setNotes] = useState('');

  const generateTrackingCode = (n: string) => {
    if (!n) return '';
    const base = n.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${base}${rand}`;
  };

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('isActive', statusFilter === 'active' ? 'true' : 'false');

      const res = await fetch(`/api/admin/partners?${params}`);
      const data = await res.json();
      if (!data.error) {
        setPartners(data.partners);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error('Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  }, [page, search, platformFilter, statusFilter, toast]);

  useEffect(() => {
    // debounce search
    const t = setTimeout(fetchPartners, 300);
    return () => clearTimeout(t);
  }, [fetchPartners]);

  const openNewModal = () => {
    setFormId(null);
    setName('');
    setEmail('');
    setPlatform(PLATFORMS[0]);
    setChannelName('');
    setTrackingCode('');
    setCommissionRate('0');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (p: Partner) => {
    setFormId(p.id);
    setName(p.name);
    setEmail(p.email || '');
    setPlatform(p.platform);
    setChannelName(p.channelName || '');
    setTrackingCode(p.trackingCode);
    setCommissionRate(String(p.commissionRate));
    setNotes(p.notes || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name || !platform || !trackingCode) {
      toast.warning('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        email: email || undefined,
        platform,
        channelName: channelName || undefined,
        trackingCode,
        commissionRate,
        notes: notes || undefined
      };

      const endpoint = formId ? `/api/admin/partners/${formId}` : '/api/admin/partners';
      const method = formId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(formId ? 'Parceiro atualizado' : 'Parceiro criado com sucesso');
      setShowModal(false);
      fetchPartners();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar parceiro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este parceiro?')) return;
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Parceiro desativado');
      fetchPartners();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desativar parceiro');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info('Código copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Handshake className="w-8 h-8 text-indigo-400" weight="duotone" />
            Parceiros & Afiliados
          </h1>
          <p className="text-zinc-400 mt-1">Gerencie influenciadores, canais e comissões.</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Parceiro
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-6 h-6 text-indigo-400" weight="duotone" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-100">{total}</p>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Total de Parceiros</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-6 h-6 text-emerald-400" weight="duotone" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-100">{stats.active}</p>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Parceiros Ativos</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <ChartLineUp className="w-6 h-6 text-amber-400" weight="duotone" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-100">R$ {stats.totalRevenue.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Receita Gerada</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">Todas as Plataformas</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Plataforma/Canal</th>
                <th className="px-6 py-4 font-medium">Código</th>
                <th className="px-6 py-4 font-medium text-right">Comissão %</th>
                <th className="px-6 py-4 font-medium text-right">Receita Gerada</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className={`hover:bg-zinc-800/20 transition-colors ${!p.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-200">{p.name}</p>
                      {p.email && <p className="text-xs text-zinc-500">{p.email}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-max items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                          {p.platform}
                        </span>
                        {p.channelName && <span className="text-xs text-zinc-500">@{p.channelName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => copyToClipboard(p.trackingCode)} className="group flex items-center gap-1.5 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-indigo-500/50 transition-colors">
                        <span className="font-mono text-xs text-zinc-300">{p.trackingCode}</span>
                        <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-amber-400">
                      {p.commissionRate}%
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-300">
                      R$ {p.totalRevenue.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${p.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Editar"
                          className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                        >
                          <PencilSimple weight="fill" className="w-4 h-4" />
                        </button>
                        {p.isActive && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Desativar"
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash weight="fill" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <span className="text-sm text-zinc-500">
              Página {page} de {totalPages} • {total} parceiros
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg">Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-100">
                {formId ? 'Editar Parceiro' : 'Novo Parceiro'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Nome do Parceiro <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!formId && !trackingCode) setTrackingCode(generateTrackingCode(e.target.value));
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">E-mail (opcional)</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Plataforma Principal <span className="text-red-400">*</span></label>
                  <select
                    value={platform} onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Nome do Canal/Perfil</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                    <input
                      type="text" value={channelName} onChange={(e) => setChannelName(e.target.value.replace('@', ''))}
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 pl-8 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 pt-4 border-t border-zinc-800/50">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Código de Rastreio <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="gerado automaticamente"
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Sufixo usado na URL: ?ref=codigo</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Comissão Padrão (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Notas Internas</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-3 justify-end rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-zinc-300 hover:text-white font-medium">Cancelar</button>
              <button 
                onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar Parceiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
