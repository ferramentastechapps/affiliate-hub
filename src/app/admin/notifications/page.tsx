'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Users, CheckCircle, XCircle, X, PaperPlaneTilt, PencilSimple, Trash, Funnel, Image, Tag, Ticket } from '@phosphor-icons/react';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  createdAt: string;
  preferences: {
    all?: boolean;
    couponsOnly?: boolean;
    categories?: string[];
  } | null;
  user?: User | null;
}

interface RecentSent {
  id: string;
  createdAt: string;
  details: {
    title?: string;
    body?: string;
    sent?: number;
    failed?: number;
    total?: number;
  } | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPage() {
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [recentSent, setRecentSent] = useState<RecentSent[]>([]);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de envio
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Filtros de segmentação
  const [target, setTarget] = useState<'all' | 'coupons' | 'categories'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Modais e Statuses
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Edição de preferência de assinante específico
  const [editingSub, setEditingSub] = useState<PushSubscription | null>(null);
  const [editAll, setEditAll] = useState(true);
  const [editCouponsOnly, setEditCouponsOnly] = useState(false);
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (!data.error) {
        setTotalSubscriptions(data.totalSubscriptions);
        setRecentSent(data.recentSent || []);
        setSubscriptions(data.subscriptions || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) {
        setCategoriesList(data.categories);
      }
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [fetchData, fetchCategories]);

  // Handler para disparo de push segmentado
  const handleSend = async () => {
    setSending(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          body, 
          url: url || undefined, 
          imageUrl: imageUrl || undefined,
          target,
          categories: target === 'categories' ? selectedCategories : undefined
        }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setResult(data);
        setTitle('');
        setBody('');
        setUrl('');
        setImageUrl('');
        setTarget('all');
        setSelectedCategories([]);
        fetchData();
      }
    } catch {
      setErrorMsg('Erro de rede ao enviar notificações.');
    }
    setSending(false);
    setShowConfirm(false);
  };

  // Handler para deletar assinatura
  const handleDeleteSub = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta inscrição de notificação?')) return;
    try {
      const res = await fetch(`/api/admin/notifications/subscriptions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao excluir assinatura.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede ao excluir.');
    }
  };

  // Handler para iniciar edição de preferências
  const startEditSub = (sub: PushSubscription) => {
    setEditingSub(sub);
    const prefs = sub.preferences || { all: true, couponsOnly: false, categories: [] };
    setEditAll(prefs.all ?? true);
    setEditCouponsOnly(prefs.couponsOnly ?? false);
    setEditSelectedCategories(prefs.categories || []);
  };

  // Handler para salvar preferências modificadas pelo admin
  const handleSavePreferences = async () => {
    if (!editingSub) return;
    setSavingPrefs(true);
    try {
      const updatedPrefs = {
        all: editAll,
        couponsOnly: editCouponsOnly,
        categories: (editAll || editCouponsOnly) ? [] : editSelectedCategories
      };

      const res = await fetch(`/api/admin/notifications/subscriptions/${editingSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updatedPrefs }),
      });

      if (res.ok) {
        setEditingSub(null);
        fetchData();
      } else {
        alert('Erro ao salvar preferências.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleCategorySelection = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleEditCategorySelection = (cat: string) => {
    setEditSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleEditToggleReceiveAll = () => {
    setEditAll(prev => {
      const next = !prev;
      if (next) {
        setEditCouponsOnly(false);
        setEditSelectedCategories([]);
      }
      return next;
    });
  };

  const handleEditToggleCouponsOnly = () => {
    setEditCouponsOnly(prev => {
      const next = !prev;
      if (next) {
        setEditAll(false);
        setEditSelectedCategories([]);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Bell className="w-8 h-8 text-teal-400" weight="duotone" />
          Push Notifications
        </h1>
        <p className="text-zinc-400 mt-1">Gerencie assinantes PWA e dispare notificações com segmentação avançada.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Active subscribers statistics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-5">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
              <Users className="w-8 h-8 text-teal-400" weight="duotone" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-100">{loading ? '—' : totalSubscriptions}</p>
              <p className="text-sm text-zinc-500 mt-1">Dispositivos PWA Registrados</p>
            </div>
          </div>

          {/* Send Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <PaperPlaneTilt className="w-5 h-5 text-teal-400" />
              Enviar Notificação
            </h2>

            {result && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="text-emerald-300 font-medium">Notificação enviada!</p>
                  <p className="text-emerald-400/70 text-xs mt-1">
                    {result.sent} enviadas com sucesso • {result.failed} falhas • {result.total} total filtrado
                  </p>
                </div>
                <button onClick={() => setResult(null)} className="ml-auto text-emerald-400/60 hover:text-emerald-400"><X className="w-4 h-4" /></button>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Título <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: 🔥 Super oferta disponível!"
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Mensagem <span className="text-red-400">*</span></label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Descrição amigável da notificação..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">URL de destino (opcional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://economizei.com/produto/..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1.5 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-zinc-500" />
                  URL da Imagem Rich Push (opcional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://imagem-do-produto.jpg (passará por validação HEAD)"
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm placeholder-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
                {imageUrl && (
                  <p className="text-[11px] text-zinc-500 mt-1 italic">
                    A imagem será testada em segundo plano. Se a URL falhar ou retornar erro, o push enviará sem imagem (fallback).
                  </p>
                )}
              </div>

              {/* Segmentação section */}
              <div className="bg-zinc-800/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Funnel className="w-4 h-4 text-teal-400" />
                  Segmentação dos Destinatários
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTarget('all')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      target === 'all'
                        ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Todos os Assinantes
                  </button>
                  <button
                    type="button"
                    onClick={() => setTarget('coupons')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      target === 'coupons'
                        ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 inline mr-1" />
                    Só quem quer Cupons
                  </button>
                  <button
                    type="button"
                    onClick={() => setTarget('categories')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      target === 'categories'
                        ? 'bg-teal-500/10 border-teal-500 text-teal-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 inline mr-1" />
                    Categorias
                  </button>
                </div>

                {target === 'categories' && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-400 mb-2">Selecione uma ou mais categorias alvo:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {categoriesList.map(cat => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <div 
                            key={cat}
                            onClick={() => toggleCategorySelection(cat)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-zinc-850 border-teal-500 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <span className="capitalize">{cat}</span>
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-teal-500 border-teal-500' : 'border-zinc-750'
                            }`}>
                              {isSelected && <CheckCircle size={10} weight="bold" className="text-zinc-900" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!title.trim() || !body.trim() || sending || (target === 'categories' && selectedCategories.length === 0)}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <PaperPlaneTilt className="w-4 h-4" weight="duotone" />
              Enviar Notificação Segmentada
            </button>
          </div>
        </div>

        {/* Right: History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-zinc-100">Envios Recentes</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />)}
            </div>
          ) : recentSent.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhum envio registrado ainda.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recentSent.map((item) => (
                <div key={item.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-zinc-200">{item.details?.title || '—'}</p>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">{formatDate(item.createdAt)}</span>
                  </div>
                  {item.details?.body && (
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{item.details.body}</p>
                  )}
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400">{item.details?.sent ?? 0} enviadas</span>
                    {(item.details?.failed ?? 0) > 0 && (
                      <span className="text-red-400">{item.details?.failed} falhas</span>
                    )}
                    <span className="text-zinc-600">{item.details?.total ?? 0} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Gerenciamento de Assinantes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-400" />
          Gerenciar Assinantes PWA
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-800 rounded-xl animate-pulse" />)}
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma assinatura registrada no banco de dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Cadastrado em</th>
                  <th className="py-3 px-4">Preferências</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {subscriptions.map((sub) => {
                  const prefs = sub.preferences;
                  let displayPrefs = 'Todas (Legado)';
                  if (prefs) {
                    if (prefs.all === true) {
                      displayPrefs = 'Todas as promoções 🔔';
                    } else if (prefs.couponsOnly === true) {
                      displayPrefs = 'Apenas Cupons 🎟️';
                    } else if (prefs.categories && prefs.categories.length > 0) {
                      displayPrefs = `Categorias: ${prefs.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`;
                    } else {
                      displayPrefs = 'Nenhuma selecionada ⚠️';
                    }
                  }

                  return (
                    <tr key={sub.id} className="text-sm text-zinc-300 hover:bg-zinc-850/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {sub.user?.image ? (
                            <img src={sub.user.image} alt={sub.user.name} className="w-8 h-8 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-teal-400 border border-zinc-700">
                              {sub.user ? sub.user.name.charAt(0).toUpperCase() : 'V'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-zinc-200">{sub.user ? sub.user.name : 'Visitante'}</p>
                            <p className="text-xs text-zinc-500">{sub.user ? sub.user.email : 'Dispositivo Anônimo PWA'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">{formatDate(sub.createdAt)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          prefs?.all === true || !prefs
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : prefs?.couponsOnly === true
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-750'
                        }`}>
                          {displayPrefs}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEditSub(sub)}
                            className="p-2 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Editar Preferências"
                          >
                            <PencilSimple size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                            title="Revogar Assinatura"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowConfirm(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-100">Confirmar envio</h3>
              <button onClick={() => setShowConfirm(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm font-semibold text-zinc-200">{title}</p>
              <p className="text-sm text-zinc-400">{body}</p>
              {url && <p className="text-xs text-zinc-500 font-mono break-all">{url}</p>}
              {imageUrl && <p className="text-[11px] text-teal-400/80 font-mono truncate">Foto: {imageUrl}</p>}
            </div>

            <p className="text-sm text-zinc-400 mb-5">
              Você enviará para assinantes que se enquadrem no filtro:{' '}
              <span className="text-teal-400 font-bold capitalize">
                {target === 'all' ? 'todos' : target === 'coupons' ? 'só cupons' : `categorias (${selectedCategories.join(', ')})`}
              </span>.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <PaperPlaneTilt className="w-4 h-4" />
                {sending ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Preferences Editing Modal */}
      {editingSub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setEditingSub(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Editar Preferências</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{editingSub.user?.email || 'Dispositivo Anônimo'}</p>
              </div>
              <button onClick={() => setEditingSub(null)} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 my-5">
              {/* Toggles all and couponsOnly */}
              <div className="space-y-3">
                <div 
                  onClick={handleEditToggleReceiveAll}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                    editAll ? 'bg-teal-500/5 border-teal-500/40 text-teal-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">🔔 Todas as Promoções</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Recebe todos os pushs gerados</p>
                  </div>
                  <div className={`w-10 h-5.5 rounded-full transition-colors relative ${editAll ? 'bg-teal-500' : 'bg-zinc-600'}`}>
                    <div className={`w-4.5 h-4.5 bg-zinc-900 rounded-full absolute top-0.5 transition-transform ${editAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div 
                  onClick={handleEditToggleCouponsOnly}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                    editCouponsOnly ? 'bg-teal-500/5 border-teal-500/40 text-teal-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">🎟️ Só Cupons</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Recebe unicamente descontos de cupom</p>
                  </div>
                  <div className={`w-10 h-5.5 rounded-full transition-colors relative ${editCouponsOnly ? 'bg-teal-500' : 'bg-zinc-600'}`}>
                    <div className={`w-4.5 h-4.5 bg-zinc-900 rounded-full absolute top-0.5 transition-transform ${editCouponsOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              {/* Categorias checkbox grid */}
              {!editAll && !editCouponsOnly && (
                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Categorias Permitidas</p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {categoriesList.map(cat => {
                      const isSelected = editSelectedCategories.includes(cat);
                      return (
                        <div 
                          key={cat}
                          onClick={() => toggleEditCategorySelection(cat)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-zinc-850 border-teal-500 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          <span className="capitalize">{cat}</span>
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-teal-500 border-teal-500' : 'border-zinc-750'
                          }`}>
                            {isSelected && <CheckCircle size={10} weight="bold" className="text-zinc-900" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-zinc-800 pt-4 mt-5">
              <button 
                onClick={() => setEditingSub(null)} 
                className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs || (!editAll && !editCouponsOnly && editSelectedCategories.length === 0)}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center"
              >
                {savingPrefs ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
