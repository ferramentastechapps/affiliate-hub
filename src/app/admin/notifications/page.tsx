'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Users, CheckCircle, XCircle, X, PaperPlaneTilt } from '@phosphor-icons/react';

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
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      if (!data.error) {
        setTotalSubscriptions(data.totalSubscriptions);
        setRecentSent(data.recentSent || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async () => {
    setSending(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: url || undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setResult(data);
        setTitle('');
        setBody('');
        setUrl('');
        fetchData();
      }
    } catch {
      setErrorMsg('Erro de rede ao enviar notificações.');
    }
    setSending(false);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Bell className="w-8 h-8 text-teal-400" weight="duotone" />
          Push Notifications
        </h1>
        <p className="text-zinc-400 mt-1">Envie notificações push para todos os assinantes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Stats + Form */}
        <div className="space-y-4">
          {/* Subscribers card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-5">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
              <Users className="w-8 h-8 text-teal-400" weight="duotone" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-100">{loading ? '—' : totalSubscriptions}</p>
              <p className="text-sm text-zinc-500 mt-1">Assinantes ativos</p>
            </div>
          </div>

          {/* Send Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Enviar Notificação</h2>

            {result && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <p className="text-emerald-300 font-medium">Notificação enviada!</p>
                  <p className="text-emerald-400/70 text-xs mt-1">
                    {result.sent} enviadas com sucesso • {result.failed} falhas • {result.total} total
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
                placeholder="Descrição da notificação..."
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

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!title.trim() || !body.trim() || sending}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <PaperPlaneTilt className="w-4 h-4" weight="duotone" />
              Enviar para todos os assinantes
            </button>
          </div>
        </div>

        {/* Right: Recent Sent History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100">Envios Recentes</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />)}
            </div>
          ) : recentSent.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhum envio registrado ainda.</p>
          ) : (
            <div className="space-y-3">
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

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-100">Confirmar envio</h3>
              <button onClick={() => setShowConfirm(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm font-semibold text-zinc-200">{title}</p>
              <p className="text-sm text-zinc-400">{body}</p>
              {url && <p className="text-xs text-zinc-500 font-mono">{url}</p>}
            </div>

            <p className="text-sm text-zinc-400 mb-5">
              Você está prestes a enviar uma notificação para{' '}
              <span className="text-teal-400 font-bold">{totalSubscriptions} assinantes</span>. Esta ação não pode ser desfeita.
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
    </div>
  );
}
