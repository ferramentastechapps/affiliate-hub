'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChatCircleDots,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  Warning,
  QrCode,
  PaperPlaneRight,
  Lightning,
  Trash,
  Clock,
  Broadcast,
  ListDashes,
  Scroll,
  Info,
  ShieldCheck,
  Globe,
  Copy,
  Check
} from '@phosphor-icons/react';

interface QueuedItem {
  score: number;
  message: string;
  imageUrl?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  message: string;
  details?: string | null;
}

interface WhatsAppStatusData {
  isReady: boolean;
  status: 'CONNECTED' | 'NEED_QR' | 'INITIALIZING' | 'DISCONNECTED' | 'OFFLINE';
  qrCode: string | null;
  queueLength: number;
  queue: QueuedItem[];
  lastFlushTime: string | null;
  flushCount: number;
  errorCount: number;
  lastError: string | null;
  readyAt: string | null;
  groupConfigured: {
    name: string | null;
    id: string | null;
  };
  delayMinutes: number;
  outsideSchedule: boolean;
  logs: LogEntry[];
  engineOnline: boolean;
  pm2: {
    pm2Status: string;
    pm2Restarts: number;
    pm2Uptime: number;
  };
}

type ActionType = 'reconnect' | 'reset-session' | 'flush' | 'pm2-restart';

function formatUptime(seconds: number) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return 'Nenhum envio recente';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return isoStr;
  }
}

export default function WhatsAppAdminPage() {
  const [statusData, setStatusData] = useState<WhatsAppStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'logs' | 'pm2'>('overview');
  const [logFilter, setLogFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');
  
  // Actions modal / loading
  const [confirmAction, setConfirmAction] = useState<{
    action: ActionType;
    title: string;
    description: string;
    color: string;
  } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [pm2Logs, setPm2Logs] = useState<string[]>([]);
  const [loadingPm2Logs, setLoadingPm2Logs] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      const data = await res.json();
      setStatusData(data);
    } catch (err: any) {
      console.error('Erro ao buscar status do WhatsApp:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingPm2Logs(true);
    try {
      const res = await fetch('/api/admin/whatsapp/logs');
      const data = await res.json();
      setPm2Logs(data.pm2Logs || []);
    } catch {
      // ignore
    } finally {
      setLoadingPm2Logs(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling automático
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    setExecuting(true);
    setActionResult(null);

    try {
      const res = await fetch('/api/admin/whatsapp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction.action }),
      });
      const data = await res.json();

      if (res.ok && (data.success || data.queued || !data.error)) {
        setActionResult({
          success: true,
          message: data.message || 'Ação solicitada com sucesso! Aguarde alguns segundos para atualização de status.',
        });
        setTimeout(() => {
          fetchStatus();
        }, 3000);
      } else {
        setActionResult({
          success: false,
          message: data.error || 'Falha ao executar ação no servidor.',
        });
      }
    } catch (err: any) {
      setActionResult({
        success: false,
        message: `Erro na requisição: ${err.message}`,
      });
    } finally {
      setExecuting(false);
    }
  };

  const copyLogsToClipboard = () => {
    if (!statusData?.logs) return;
    const text = statusData.logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.details || ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Badge Helpers
  const getStatusBadge = () => {
    if (!statusData) return null;
    const { status, isReady, engineOnline } = statusData;

    if (!engineOnline || status === 'OFFLINE') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs animate-pulse">
          <XCircle size={18} className="text-red-400" />
          <span>Serviço Offline</span>
        </div>
      );
    }

    if (isReady && status === 'CONNECTED') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>Conectado e Operacional</span>
        </div>
      );
    }

    if (status === 'NEED_QR') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs animate-bounce">
          <QrCode size={18} className="text-amber-400" />
          <span>Aguardando Escaneamento de QR Code</span>
        </div>
      );
    }

    if (status === 'INITIALIZING') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold text-xs">
          <ArrowsClockwise size={18} className="text-blue-400 animate-spin" />
          <span>Inicializando Conexão...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-semibold text-xs">
        <XCircle size={18} />
        <span>Desconectado</span>
      </div>
    );
  };

  const filteredLogs = (statusData?.logs || []).filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'critical') return log.level === 'critical';
    if (logFilter === 'error') return log.level === 'error' || log.level === 'critical';
    if (logFilter === 'warning') return log.level === 'warning';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <ChatCircleDots size={28} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-wide">Gerenciador de WhatsApp</h1>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Monitoramento em tempo real, reconexão manual e controle de disparos para o grupo.
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer bg-zinc-800/80 px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-600 transition-colors">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span>Atualizar auto (4s)</span>
          </label>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all disabled:opacity-50"
          >
            <ArrowsClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta se QR Code for necessário */}
      {statusData?.status === 'NEED_QR' && statusData?.qrCode && (
        <div className="bg-gradient-to-r from-amber-950/70 to-zinc-900 border-2 border-amber-500/40 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-xl shadow-lg border border-amber-500/30 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={statusData.qrCode}
              alt="QR Code WhatsApp"
              className="w-56 h-56 object-contain rounded"
            />
          </div>
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full">
              <QrCode size={16} /> ESCANEAR PARA CONECTAR
            </div>
            <h2 className="text-lg font-bold text-amber-100">
              Escaneie este QR Code no WhatsApp do celular
            </h2>
            <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside font-medium">
              <li>Abra o WhatsApp no seu smartphone.</li>
              <li>Toque no menu <strong>Configurações / Opções</strong> e escolha <strong>Dispositivos Conectados</strong>.</li>
              <li>Toque em <strong>Conectar um dispositivo</strong> e aponte a câmera para esta tela.</li>
            </ol>
            <p className="text-xs text-amber-400/80 italic">
              O QR Code expira e atualiza automaticamente. Assim que for lido, a conexão será estabelecida!
            </p>
          </div>
        </div>
      )}

      {/* Alerta de erro recente */}
      {statusData?.lastError && statusData.status !== 'NEED_QR' && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-300 text-xs">
          <Warning size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold text-red-200 block">Último erro detectado:</strong>
            <p className="mt-0.5 font-mono bg-red-950/40 p-2 rounded border border-red-500/20 text-[11px] overflow-x-auto">
              {statusData.lastError}
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estado da Conexão */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Estado da Conexão</span>
            <ShieldCheck size={18} className="text-indigo-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-white">
              {statusData?.status === 'CONNECTED' ? 'Conectado' : statusData?.status === 'NEED_QR' ? 'Requer QR Code' : statusData?.status === 'INITIALIZING' ? 'Inicializando' : 'Desconectado'}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <Clock size={14} /> PM2 Uptime: <span className="font-mono text-zinc-200">{formatUptime(statusData?.pm2?.pm2Uptime || 0)}</span>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Reinícios PM2: {statusData?.pm2?.pm2Restarts || 0}</span>
            <span>Pronto em: {statusData?.readyAt ? formatDate(statusData.readyAt) : '—'}</span>
          </div>
        </div>

        {/* Card 2: Balde (Fila) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Balde de Ofertas</span>
            <ListDashes size={18} className="text-purple-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{statusData?.queueLength || 0}</span>
              <span className="text-xs text-zinc-400">oferta(s) retidas</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Intervalo de janela: <strong className="text-zinc-200">{statusData?.delayMinutes || 30} minutos</strong>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Fora do horário (00h-07h): {statusData?.outsideSchedule ? 'Sim 🌙' : 'Não ☀️'}</span>
          </div>
        </div>

        {/* Card 3: Disparos & Sucesso */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Histórico de Disparos</span>
            <PaperPlaneRight size={18} className="text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-emerald-400">
              {statusData?.flushCount || 0} <span className="text-xs text-zinc-400 font-normal">enviados nesta sessão</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Último envio: <span className="text-zinc-200">{formatDate(statusData?.lastFlushTime || null)}</span>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Falhas registradas: <strong className="text-red-400">{statusData?.errorCount || 0}</strong></span>
          </div>
        </div>

        {/* Card 4: Grupo Configurado */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Grupo Alvo</span>
            <Broadcast size={18} className="text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-sm font-bold text-white truncate">
              {statusData?.groupConfigured?.name || 'Não configurado via nome'}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1 truncate">
              JID: {statusData?.groupConfigured?.id || 'Automático'}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Config no .env</span>
            <span className={statusData?.groupConfigured?.name || statusData?.groupConfigured?.id ? 'text-emerald-400' : 'text-amber-400'}>
              {statusData?.groupConfigured?.name || statusData?.groupConfigured?.id ? 'Ativo' : 'Pendente'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Ações e Diagnósticos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Reconectar */}
          <button
            onClick={() => setConfirmAction({
              action: 'reconnect',
              title: 'Reconectar WhatsApp',
              description: 'Tentará reinicializar o cliente sem apagar a sessão existente.',
              color: 'bg-indigo-600 hover:bg-indigo-500',
            })}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-indigo-950/40 border border-zinc-700 hover:border-indigo-500/50 text-indigo-300 font-semibold text-xs rounded-xl transition-all shadow"
          >
            <ArrowsClockwise size={18} className="text-indigo-400" />
            <span>Reconectar WhatsApp</span>
          </button>

          {/* Action 2: Resetar Sessão (Novo QR) */}
          <button
            onClick={() => setConfirmAction({
              action: 'reset-session',
              title: 'Resetar Sessão (Gerar Novo QR Code)',
              description: 'Apagará a sessão antiga e reiniciará o cliente para exigir um novo escaneamento de QR Code.',
              color: 'bg-amber-600 hover:bg-amber-500',
            })}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-amber-950/40 border border-zinc-700 hover:border-amber-500/50 text-amber-300 font-semibold text-xs rounded-xl transition-all shadow"
          >
            <QrCode size={18} className="text-amber-400" />
            <span>Resetar Sessão (Novo QR)</span>
          </button>

          {/* Action 3: Disparar Balde */}
          <button
            onClick={() => setConfirmAction({
              action: 'flush',
              title: 'Disparar Balde Agora (Flush)',
              description: 'Enviará imediatamente a melhor oferta retida na fila para o grupo do WhatsApp.',
              color: 'bg-emerald-600 hover:bg-emerald-500',
            })}
            disabled={!statusData?.queueLength}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-emerald-950/40 border border-zinc-700 hover:border-emerald-500/50 text-emerald-300 font-semibold text-xs rounded-xl transition-all shadow disabled:opacity-40 disabled:pointer-events-none"
          >
            <PaperPlaneRight size={18} className="text-emerald-400" />
            <span>Disparar Balde Agora ({statusData?.queueLength || 0})</span>
          </button>

          {/* Action 4: Reiniciar PM2 */}
          <button
            onClick={() => setConfirmAction({
              action: 'pm2-restart',
              title: 'Reiniciar Servidor PM2',
              description: 'Executará "pm2 restart whatsapp-engine" no servidor.',
              color: 'bg-red-600 hover:bg-red-500',
            })}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-red-950/40 border border-zinc-700 hover:border-red-500/50 text-red-300 font-semibold text-xs rounded-xl transition-all shadow"
          >
            <Lightning size={18} className="text-red-400" />
            <span>Reiniciar PM2 Process</span>
          </button>
        </div>
      </div>

      {/* Tabs Section (Fila & Logs) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info size={16} /> Visão Geral & Fila
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Scroll size={16} /> Logs do Engine ({statusData?.logs?.length || 0})
          </button>

          <button
            onClick={() => {
              setActiveTab('pm2');
              fetchLogs();
            }}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'pm2'
                ? 'border-indigo-500 text-indigo-400 bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListDashes size={16} /> Logs PM2 Brutos
          </button>
        </div>

        {/* Tab 1: Visão Geral & Fila */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ListDashes size={18} className="text-indigo-400" /> Fila Atual do Balde
            </h3>
            {(!statusData?.queue || statusData.queue.length === 0) ? (
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-8 text-center text-zinc-500 text-xs">
                O balde de ofertas está vazio no momento. Ofertas encontradas pelo bot entrarão aqui para envio na próxima janela.
              </div>
            ) : (
              <div className="space-y-3">
                {statusData.queue.map((item, idx) => (
                  <div key={idx} className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {item.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.imageUrl} alt="Oferta" className="w-14 h-14 object-cover rounded-lg border border-zinc-700 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-600 font-bold text-xs flex-shrink-0">
                          Sem Imagem
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded">
                            Score: {item.score}
                          </span>
                          <span className="text-[10px] text-zinc-500">Posição #{idx + 1}</span>
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2 font-mono whitespace-pre-line">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Logs do Engine */}
        {activeTab === 'logs' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              {/* Filter Buttons */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400 font-semibold mr-1">Filtrar:</span>
                {(['all', 'critical', 'error', 'warning'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-3 py-1 rounded-lg border transition-all text-xs font-semibold capitalize ${
                      logFilter === filter
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {filter === 'all' ? 'Todos' : filter === 'critical' ? 'Críticos' : filter === 'error' ? 'Erros' : 'Alertas'}
                  </button>
                ))}
              </div>

              <button
                onClick={copyLogsToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
              >
                {copiedLog ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLog ? 'Copiado!' : 'Copiar Logs'}</span>
              </button>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="bg-zinc-950/60 p-8 rounded-xl text-center text-zinc-500 text-xs">
                Nenhum log registrado para este filtro.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {filteredLogs.map((log, i) => {
                  const isCrit = log.level === 'critical';
                  const isErr = log.level === 'error';
                  const isWarn = log.level === 'warning';

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
                        isCrit
                          ? 'bg-red-950/50 border-red-500/40 text-red-200'
                          : isErr
                          ? 'bg-red-900/20 border-red-500/20 text-red-300'
                          : isWarn
                          ? 'bg-amber-900/20 border-amber-500/20 text-amber-300'
                          : 'bg-zinc-950/70 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] opacity-80 mb-1">
                        <span className="font-bold uppercase tracking-wider">{log.level}</span>
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                      <div>{log.message}</div>
                      {log.details && (
                        <div className="mt-1 text-[11px] opacity-75 bg-black/40 p-1.5 rounded border border-white/5 overflow-x-auto">
                          {log.details}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Logs PM2 Brutos */}
        {activeTab === 'pm2' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Últimas 50 linhas gravadas no processo PM2</span>
              <button
                onClick={fetchLogs}
                disabled={loadingPm2Logs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
              >
                <ArrowsClockwise size={14} className={loadingPm2Logs ? 'animate-spin' : ''} />
                <span>Atualizar PM2 Logs</span>
              </button>
            </div>

            <div className="bg-black/90 p-4 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-96 overflow-y-auto space-y-1 custom-scrollbar">
              {pm2Logs.length === 0 ? (
                <div className="text-zinc-600 italic text-center py-4">Sem logs PM2 disponíveis no momento.</div>
              ) : (
                pm2Logs.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-all hover:bg-zinc-900/80 px-1 py-0.5 rounded">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{confirmAction.title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {confirmAction.description}
            </p>

            {actionResult && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold border ${
                  actionResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {actionResult.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setActionResult(null);
                }}
                disabled={executing}
                className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecuteAction}
                disabled={executing}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all flex items-center gap-2 shadow ${confirmAction.color} disabled:opacity-50`}
              >
                {executing && <ArrowsClockwise size={14} className="animate-spin" />}
                <span>Confirmar e Executar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
