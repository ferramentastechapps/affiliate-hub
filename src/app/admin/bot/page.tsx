'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Robot, Play, Stop, ArrowsClockwise, Lightning,
  CheckCircle, XCircle, Warning, X, Gear, Scroll,
  WifiHigh, Timer, ChartBar, FloppyDisk, Info
} from '@phosphor-icons/react';

// ---------- tipos ----------
interface BotStatus {
  status: 'online' | 'offline' | 'error';
  pm2Status: string;
  uptime: number;
  lastRun: string | null;
  productsScrapedToday: number;
  recentLogs: string[];
  error?: string;
}

interface BotConfig {
  SEARCH_INTERVAL_MINUTES: string;
  TELEGRAM_POST_INTERVAL_MINUTES: string;
  MIN_QUALITY_SCORE: string;
  MIN_DISCOUNT_PERCENT: string;
}

interface ParsedLog {
  raw: string;
  level: 'critical' | 'warning' | 'info';
  timestamp: string | null;
  message: string;
}

interface LogsData {
  critical: ParsedLog[];
  warning: ParsedLog[];
  info: ParsedLog[];
  total: number;
}

type BotAction = 'restart' | 'stop' | 'start' | 'force-scrape';
type Tab = 'status' | 'config' | 'logs';

// ---------- helpers ----------
function formatUptime(seconds: number) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const ACTIONS: { action: BotAction; label: string; icon: React.ElementType; color: string; confirm: string }[] = [
  { action: 'restart', label: 'Reiniciar', icon: ArrowsClockwise, color: 'bg-amber-600 hover:bg-amber-500', confirm: 'Reiniciar o bot? Ficará indisponível por alguns segundos.' },
  { action: 'stop', label: 'Parar', icon: Stop, color: 'bg-red-600 hover:bg-red-500', confirm: 'Parar o bot? O scraping será interrompido.' },
  { action: 'start', label: 'Iniciar', icon: Play, color: 'bg-emerald-600 hover:bg-emerald-500', confirm: 'Iniciar o bot?' },
  { action: 'force-scrape', label: 'Forçar Busca', icon: Lightning, color: 'bg-indigo-600 hover:bg-indigo-500', confirm: 'Forçar uma busca agora? O bot será reiniciado imediatamente.' },
];

const CONFIG_LABELS: Record<keyof BotConfig, { label: string; desc: string; unit: string; min: number; max: number }> = {
  SEARCH_INTERVAL_MINUTES: { label: 'Intervalo de Busca', desc: 'A cada quantos minutos o robô varre os sites de promoção', unit: 'min', min: 1, max: 120 },
  TELEGRAM_POST_INTERVAL_MINUTES: { label: 'Intervalo de Publicação', desc: 'Tempo mínimo entre cada post no grupo VIP do Telegram', unit: 'min', min: 1, max: 60 },
  MIN_QUALITY_SCORE: { label: 'Score Mínimo', desc: 'Pontuação mínima para um produto entrar na fila do Telegram', unit: 'pts', min: 0, max: 100 },
  MIN_DISCOUNT_PERCENT: { label: 'Desconto Mínimo', desc: 'Percentual mínimo de desconto para considerar uma promoção', unit: '%', min: 0, max: 90 },
};

// ---------- componente principal ----------
export default function BotPage() {
  const [activeTab, setActiveTab] = useState<Tab>('status');

  // status
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [confirmAction, setConfirmAction] = useState<typeof ACTIONS[0] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // config
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<BotConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configResult, setConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  // logs
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logTab, setLogTab] = useState<'critical' | 'warning' | 'info'>('critical');

  // ---------- fetch status ----------
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bot/status');
      const data = await res.json();
      setBotStatus(data);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStatus]);

  // ---------- fetch config ----------
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/admin/bot/config');
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setConfigDraft(data.config);
      }
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // ---------- fetch logs ----------
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/bot/logs');
      const data = await res.json();
      setLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'config' && !config) fetchConfig();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, config, fetchConfig, fetchLogs]);

  // ---------- ações PM2 ----------
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
      setActionResult(data.success
        ? { success: true, message: `"${confirmAction.label}" executado com sucesso.` }
        : { success: false, message: data.error || 'Falha ao executar ação.' }
      );
    } catch {
      setActionResult({ success: false, message: 'Erro de rede.' });
    }
    setExecuting(false);
    setConfirmAction(null);
    setTimeout(fetchStatus, 2000);
  };

  // ---------- salvar config ----------
  const handleSaveConfig = async () => {
    if (!configDraft) return;
    setSavingConfig(true);
    setConfigResult(null);
    try {
      const res = await fetch('/api/admin/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: configDraft }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(configDraft);
        setConfigResult({ success: true, message: data.message || 'Salvo com sucesso.' });
        setTimeout(fetchStatus, 3000);
      } else {
        setConfigResult({ success: false, message: data.error || 'Erro ao salvar.' });
      }
    } catch {
      setConfigResult({ success: false, message: 'Erro de rede.' });
    }
    setSavingConfig(false);
  };

  const configChanged = JSON.stringify(config) !== JSON.stringify(configDraft);

  // ---------- status display ----------
  const statusInfo = {
    online: { label: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', icon: CheckCircle },
    offline: { label: 'Offline', color: 'text-zinc-400', bg: 'bg-zinc-500', border: 'border-zinc-500/30', icon: XCircle },
    error: { label: 'Erro', color: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30', icon: Warning },
  };
  const status = botStatus?.status || 'offline';
  const statusDisplay = statusInfo[status];
  const StatusIcon = statusDisplay.icon;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'status', label: 'Processos', icon: WifiHigh },
    { id: 'config', label: 'Configurações', icon: Gear },
    { id: 'logs', label: 'Logs', icon: Scroll },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Robot className="w-8 h-8 text-rose-400" weight="duotone" />
          Controle do Bot
        </h1>
        <p className="text-zinc-400 mt-1">Monitore processos, ajuste configurações e leia logs do robô.</p>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== ABA: PROCESSOS ===== */}
      {activeTab === 'status' && (
        <div className="space-y-5">
          {/* Status card */}
          <div className={`bg-zinc-900 border rounded-2xl p-6 ${statusDisplay.border}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
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

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-100">{formatUptime(botStatus?.uptime || 0)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Uptime</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-300">
                    {botStatus?.lastRun ? new Date(botStatus.lastRun).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Iniciado às</p>
                </div>
              </div>

              <button onClick={fetchStatus} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors" title="Atualizar">
                <ArrowsClockwise className={`w-5 h-5 ${loadingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {botStatus?.error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {botStatus.error}
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACTIONS.map(action => {
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

          {/* Config resumida */}
          {config && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Configuração Atual
                </h2>
                <button onClick={() => setActiveTab('config')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Editar →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.keys(CONFIG_LABELS) as (keyof BotConfig)[]).map(key => (
                  <div key={key} className="bg-zinc-800/60 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-zinc-100">{config[key] || '—'}<span className="text-xs text-zinc-500 ml-1">{CONFIG_LABELS[key].unit}</span></p>
                    <p className="text-xs text-zinc-500 mt-1">{CONFIG_LABELS[key].label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ABA: CONFIGURAÇÕES ===== */}
      {activeTab === 'config' && (
        <div className="space-y-5">
          {loadingConfig ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center gap-3 text-zinc-500">
              <ArrowsClockwise className="w-5 h-5 animate-spin" /> Carregando configurações...
            </div>
          ) : configDraft ? (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
                  <Gear className="w-5 h-5 text-zinc-400" weight="duotone" />
                  <h2 className="text-lg font-bold text-zinc-100">Parâmetros do Robô</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(Object.keys(CONFIG_LABELS) as (keyof BotConfig)[]).map(key => {
                    const meta = CONFIG_LABELS[key];
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-zinc-200">{meta.label}</label>
                          <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{meta.unit}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{meta.desc}</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={meta.min}
                            max={meta.max}
                            value={configDraft[key] || meta.min}
                            onChange={e => setConfigDraft(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                            className="flex-1 accent-indigo-500"
                          />
                          <input
                            type="number"
                            min={meta.min}
                            max={meta.max}
                            value={configDraft[key] || ''}
                            onChange={e => setConfigDraft(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 text-center font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {configChanged && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-300">
                    Você tem alterações não salvas. Ao salvar, o bot será reiniciado automaticamente via PM2 para aplicar as novas configurações.
                  </p>
                </div>
              )}

              {configResult && (
                <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium ${
                  configResult.success
                    ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-900/40 border border-red-500/30 text-red-300'
                }`}>
                  {configResult.success ? <CheckCircle className="w-5 h-5" weight="fill" /> : <XCircle className="w-5 h-5" weight="fill" />}
                  {configResult.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setConfigDraft(config); setConfigResult(null); }}
                  disabled={!configChanged}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition disabled:opacity-40"
                >
                  Descartar alterações
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={!configChanged || savingConfig}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {savingConfig ? <ArrowsClockwise className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                  {savingConfig ? 'Salvando...' : 'Salvar e Reiniciar Bot'}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              Não foi possível carregar as configurações.
              <button onClick={fetchConfig} className="ml-2 text-indigo-400 hover:text-indigo-300">Tentar novamente</button>
            </div>
          )}
        </div>
      )}

      {/* ===== ABA: LOGS ===== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex gap-1">
              {([
                { id: 'critical', label: '🔴 Críticos', count: logs?.critical.length ?? 0 },
                { id: 'warning', label: '🟡 Alertas', count: logs?.warning.length ?? 0 },
                { id: 'info', label: '⚪ Info', count: logs?.info.length ?? 0 },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setLogTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    logTab === t.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
                </button>
              ))}
            </div>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              <ArrowsClockwise className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1">
            {loadingLogs ? (
              <div className="text-zinc-600 flex items-center gap-2 py-4 justify-center">
                <ArrowsClockwise className="w-4 h-4 animate-spin" /> Carregando logs...
              </div>
            ) : !logs || (logs[logTab].length === 0) ? (
              <div className="text-zinc-600 py-8 text-center">
                {logTab === 'critical' ? '✅ Nenhum erro crítico encontrado.' :
                 logTab === 'warning' ? '✅ Nenhum alerta encontrado.' :
                 'Nenhum log informativo disponível.'}
              </div>
            ) : (
              [...logs[logTab]].reverse().map((log, i) => (
                <div
                  key={i}
                  className={`flex gap-3 py-1 px-2 rounded leading-relaxed hover:bg-zinc-900/50 ${
                    log.level === 'critical' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-amber-400' :
                    'text-zinc-400'
                  }`}
                >
                  {log.timestamp && (
                    <span className="text-zinc-600 shrink-0 select-none">{log.timestamp}</span>
                  )}
                  <span className="break-all">{log.message || log.raw}</span>
                </div>
              ))
            )}
          </div>

          {logs && (
            <p className="text-xs text-zinc-600 text-right">{logs.total} linhas processadas no total</p>
          )}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-100">{confirmAction.label}</h3>
              <button onClick={() => setConfirmAction(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">{confirmAction.confirm}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition">Cancelar</button>
              <button
                onClick={handleAction}
                disabled={executing}
                className={`flex-1 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${confirmAction.color} disabled:opacity-50`}
              >
                {executing ? <ArrowsClockwise className="w-4 h-4 animate-spin" /> : <confirmAction.icon className="w-4 h-4" />}
                {executing ? 'Executando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de resultado */}
      {actionResult && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-sm font-medium ${
            actionResult.success
              ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/90 border-red-500/30 text-red-300'
          }`}>
            {actionResult.success ? <CheckCircle className="w-5 h-5" weight="fill" /> : <XCircle className="w-5 h-5" weight="fill" />}
            {actionResult.message}
            <button onClick={() => setActionResult(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
