'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Robot, Play, Stop, ArrowsClockwise, Lightning, CheckCircle, XCircle, Warning, X } from '@phosphor-icons/react';

interface BotStatus {
  status: 'online' | 'offline' | 'error';
  pm2Status: string;
  uptime: number;
  lastRun: string | null;
  productsScrapedToday: number;
  recentLogs: string[];
  error?: string;
}

type BotAction = 'restart' | 'stop' | 'start' | 'force-scrape';

function formatUptime(seconds: number) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const ACTIONS: { action: BotAction; label: string; icon: React.ElementType; color: string; confirm: string }[] = [
  { action: 'restart', label: 'Reiniciar Bot', icon: ArrowsClockwise, color: 'bg-amber-600 hover:bg-amber-500', confirm: 'Tem certeza que deseja reiniciar o bot? Ele ficará indisponível por alguns segundos.' },
  { action: 'stop', label: 'Parar Bot', icon: Stop, color: 'bg-red-600 hover:bg-red-500', confirm: 'Tem certeza que deseja parar o bot? O scraping será interrompido.' },
  { action: 'start', label: 'Iniciar Bot', icon: Play, color: 'bg-emerald-600 hover:bg-emerald-500', confirm: 'Deseja iniciar o bot?' },
  { action: 'force-scrape', label: 'Forçar Busca Agora', icon: Lightning, color: 'bg-indigo-600 hover:bg-indigo-500', confirm: 'Isso vai reiniciar o bot imediatamente para forçar uma busca. Confirmar?' },
];

export default function BotPage() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<typeof ACTIONS[0] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bot/status');
      const data = await res.json();
      setBotStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStatus]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/admin/bot/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction.action }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({ success: true, message: `Ação "${confirmAction.label}" executada com sucesso.` });
      } else {
        setActionResult({ success: false, message: data.error || 'Falha ao executar ação.' });
      }
    } catch {
      setActionResult({ success: false, message: 'Erro de rede.' });
    }
    setExecuting(false);
    setConfirmAction(null);
    setTimeout(fetchStatus, 2000);
  };

  const statusInfo = {
    online: { label: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', icon: CheckCircle },
    offline: { label: 'Offline', color: 'text-zinc-400', bg: 'bg-zinc-500', border: 'border-zinc-500/30', icon: XCircle },
    error: { label: 'Erro', color: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30', icon: Warning },
  };

  const status = botStatus?.status || 'offline';
  const statusDisplay = statusInfo[status] || statusInfo.offline;
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Robot className="w-8 h-8 text-rose-400" weight="duotone" />
          Controle do Bot
        </h1>
        <p className="text-zinc-400 mt-1">Gerencie o bot scraper via PM2.</p>
      </div>

      {/* Status Card */}
      <div className={`bg-zinc-900 border rounded-2xl p-6 ${statusDisplay.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full ${statusDisplay.bg}/20 border ${statusDisplay.border} flex items-center justify-center`}>
                <StatusIcon className={`w-8 h-8 ${statusDisplay.color}`} weight="duotone" />
              </div>
              {status === 'online' && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xl font-bold ${statusDisplay.color}`}>{statusDisplay.label}</span>
                <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded-md font-mono">{botStatus?.pm2Status || 'N/A'}</span>
              </div>
              <p className="text-sm text-zinc-500">affiliate-scraper • PM2</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-100">{formatUptime(botStatus?.uptime || 0)}</p>
              <p className="text-xs text-zinc-500 mt-1">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-100">{botStatus?.productsScrapedToday || 0}</p>
              <p className="text-xs text-zinc-500 mt-1">Produtos hoje</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-300">{formatDate(botStatus?.lastRun || null)}</p>
              <p className="text-xs text-zinc-500 mt-1">Última execução</p>
            </div>
          </div>

          {/* Refresh */}
          <button onClick={fetchStatus} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors" title="Atualizar">
            <ArrowsClockwise className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {botStatus?.error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {botStatus.error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.action}
              onClick={() => setConfirmAction(action)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl text-white font-medium text-sm transition-all ${action.color} shadow-lg hover:scale-105 active:scale-95`}
            >
              <Icon className="w-6 h-6" weight="duotone" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Logs Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">Logs Recentes</h2>
          <button onClick={fetchStatus} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowsClockwise className="w-4 h-4" />
            Atualizar logs
          </button>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-emerald-400/80 max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <span className="text-zinc-600">Carregando logs...</span>
          ) : botStatus?.recentLogs?.length ? (
            botStatus.recentLogs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">
                <span className="text-zinc-600 select-none mr-2">{i + 1}</span>
                {line}
              </div>
            ))
          ) : (
            <span className="text-zinc-600">Sem logs disponíveis.</span>
          )}
        </div>
        <p className="text-xs text-zinc-600">Auto-refresh a cada 30 segundos</p>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-100">{confirmAction.label}</h3>
              <button onClick={() => setConfirmAction(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">{confirmAction.confirm}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
              <button
                onClick={handleAction}
                disabled={executing}
                className={`flex-1 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${confirmAction.color} disabled:opacity-50`}
              >
                {executing ? <ArrowsClockwise className="w-4 h-4 animate-spin" /> : <confirmAction.icon className="w-4 h-4" />}
                {executing ? 'Executando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Result Toast */}
      {actionResult && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-sm font-medium ${
            actionResult.success
              ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/90 border-red-500/30 text-red-300'
          }`}>
            {actionResult.success ? <CheckCircle className="w-5 h-5" weight="fill" /> : <XCircle className="w-5 h-5" weight="fill" />}
            {actionResult.message}
            <button onClick={() => setActionResult(null)} className="ml-2 opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
