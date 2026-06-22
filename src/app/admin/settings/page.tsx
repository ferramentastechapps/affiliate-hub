'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  GearSix, 
  Robot, 
  PaperPlaneRight, 
  ChatCircleText, 
  Info,
  FloppyDisk,
  CheckCircle,
  WarningCircle,
  Eye,
  EyeClosed,
} from '@phosphor-icons/react';
import { useToastContext } from '@/components/ToastProvider';

export default function SettingsPage() {
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  
  // Bot Settings
  const [botInterval, setBotInterval] = useState('30');
  const [autoApproveScore, setAutoApproveScore] = useState('70');
  const [maxProducts, setMaxProducts] = useState('50');
  const [minDiscount, setMinDiscount] = useState('5');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [savingBot, setSavingBot] = useState(false);

  // Telegram Settings
  const [telegramChannelId, setTelegramChannelId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState<{success: boolean, msg?: string, error?: string} | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // WhatsApp Settings
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [testWhatsappResult, setTestWhatsappResult] = useState<{success: boolean, error?: string} | null>(null);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  // System Stats
  const [sysInfo, setSysInfo] = useState({ products: 0, users: 0, uptime: 0 });

  const loadConfig = useCallback(async () => {
    try {
      const [resConfig, resDash] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/dashboard')
      ]);
      const data = await resConfig.json();
      const dash = await resDash.json();

      if (!data.error) {
        const c = data.configs;
        setBotInterval(c.bot_interval);
        setAutoApproveScore(c.auto_approve_score);
        setMaxProducts(c.max_products_per_run);
        setMinDiscount(c.min_discount_percent);
        setAiEnabled(c.ai_enabled === 'true');
        setTelegramChannelId(c.telegram_channel_id);
        setWhatsappUrl(c.whatsapp_api_url);
        setWhatsappToken(c.whatsapp_api_token);
      }
      if (!dash.error) {
        setSysInfo({
          products: dash.products?.total || 0,
          users: dash.users?.total || 0,
          uptime: process.uptime ? Math.floor(process.uptime()) : 0
        });
      }
    } catch (err) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSaveBatch = async (updates: Record<string, any>, setSavingState: (s: boolean) => void) => {
    setSavingState(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Configurações salvas com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setSavingState(false);
    }
  };

  const saveBotSettings = () => handleSaveBatch({
    bot_interval: botInterval,
    auto_approve_score: autoApproveScore,
    max_products_per_run: maxProducts,
    min_discount_percent: minDiscount,
    ai_enabled: String(aiEnabled)
  }, setSavingBot);

  const saveTelegramSettings = () => handleSaveBatch({
    telegram_channel_id: telegramChannelId
  }, setSavingTelegram);

  const saveWhatsappSettings = () => handleSaveBatch({
    whatsapp_api_url: whatsappUrl,
    whatsapp_api_token: whatsappToken
  }, setSavingWhatsapp);

  const testTelegram = async () => {
    setTestingTelegram(true);
    setTestTelegramResult(null);
    try {
      const res = await fetch('/api/admin/config/test/telegram');
      const data = await res.json();
      if (data.success) {
        setTestTelegramResult({ success: true, msg: `Conectado: ${data.channelName}` });
      } else {
        setTestTelegramResult({ success: false, error: data.error });
      }
    } catch (err) {
      setTestTelegramResult({ success: false, error: 'Erro de rede ao testar Telegram' });
    }
    setTestingTelegram(false);
  };

  const testWhatsapp = async () => {
    setTestingWhatsapp(true);
    setTestWhatsappResult(null);
    try {
      const res = await fetch('/api/admin/config/test/whatsapp');
      const data = await res.json();
      if (data.success) {
        setTestWhatsappResult({ success: true });
      } else {
        setTestWhatsappResult({ success: false, error: data.error });
      }
    } catch (err) {
      setTestWhatsappResult({ success: false, error: 'Erro de rede ao testar WhatsApp' });
    }
    setTestingWhatsapp(false);
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <GearSix className="w-8 h-8 text-indigo-400" weight="duotone" />
          Configurações do Sistema
        </h1>
        <p className="text-zinc-400 mt-1">Gerencie os parâmetros globais e integrações da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sessão Bot */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
            <Robot className="w-6 h-6 text-indigo-400" weight="duotone" />
            <h2 className="text-lg font-bold text-zinc-100">Bot & Automação</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 flex justify-between">
                <span>Intervalo de Busca (minutos)</span>
                <span className="text-indigo-400 font-bold">{botInterval}</span>
              </label>
              <input
                type="range" min="5" max="240" step="5"
                value={botInterval} onChange={(e) => setBotInterval(e.target.value)}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 flex justify-between">
                <span>Score mínimo para aprovação automática</span>
                <span className="text-indigo-400 font-bold">{autoApproveScore}</span>
              </label>
              <input
                type="range" min="0" max="100" step="5"
                value={autoApproveScore} onChange={(e) => setAutoApproveScore(e.target.value)}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Desconto mínimo (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={minDiscount} onChange={(e) => setMinDiscount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Máx produtos por run</label>
                <input
                  type="number" min="1" max="500"
                  value={maxProducts} onChange={(e) => setMaxProducts(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">Gerar Copywriter (IA) automaticamente</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            <button
              onClick={saveBotSettings}
              disabled={savingBot}
              className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FloppyDisk className="w-4 h-4" />
              {savingBot ? 'Salvando...' : 'Salvar Configurações do Bot'}
            </button>
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
            <Info className="w-6 h-6 text-indigo-400" weight="duotone" />
            <h2 className="text-lg font-bold text-zinc-100">Informações do Sistema</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Total Produtos</span>
              <span className="text-2xl font-bold text-zinc-200 mt-1 block">{sysInfo.products}</span>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Total Usuários</span>
              <span className="text-2xl font-bold text-zinc-200 mt-1 block">{sysInfo.users}</span>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Ambiente</span>
              <span className="text-sm font-bold text-indigo-400 mt-2 block">{process.env.NODE_ENV}</span>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Node.js</span>
              <span className="text-sm font-bold text-zinc-200 mt-2 block">v18.x+</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600 text-center">Uptime estimado: {Math.floor(sysInfo.uptime / 60)} minutos</p>
        </div>

        {/* Integração Telegram */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
            <PaperPlaneRight className="w-6 h-6 text-sky-400" weight="duotone" />
            <h2 className="text-lg font-bold text-zinc-100">Integração Telegram</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">ID do Canal / Grupo</label>
              <input
                type="text"
                value={telegramChannelId}
                onChange={(e) => setTelegramChannelId(e.target.value)}
                placeholder="ex: @economizei ou -100123456789"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={testTelegram}
                disabled={testingTelegram}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {testingTelegram ? 'Testando...' : 'Testar Conexão'}
              </button>
              <button
                onClick={saveTelegramSettings}
                disabled={savingTelegram}
                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FloppyDisk className="w-4 h-4" />
                Salvar
              </button>
            </div>

            {testTelegramResult && (
              <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${testTelegramResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {testTelegramResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <WarningCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{testTelegramResult.success ? testTelegramResult.msg : testTelegramResult.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Integração WhatsApp */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
            <ChatCircleText className="w-6 h-6 text-green-400" weight="duotone" />
            <h2 className="text-lg font-bold text-zinc-100">Integração WhatsApp</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">URL da API (Webhook POST)</label>
              <input
                type="url"
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                placeholder="https://sua-api.com/send"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Token da API</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  placeholder="Seu token de autenticação..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 pl-4 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showToken ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={testWhatsapp}
                disabled={testingWhatsapp}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {testingWhatsapp ? 'Testando...' : 'Testar Conexão'}
              </button>
              <button
                onClick={saveWhatsappSettings}
                disabled={savingWhatsapp}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FloppyDisk className="w-4 h-4" />
                Salvar
              </button>
            </div>

            {testWhatsappResult && (
              <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${testWhatsappResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {testWhatsappResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <WarningCircle className="w-5 h-5 flex-shrink-0" />}
                <span>{testWhatsappResult.success ? 'Conexão bem sucedida com a API!' : testWhatsappResult.error}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
