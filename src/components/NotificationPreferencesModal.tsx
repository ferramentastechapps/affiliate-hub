'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BellRinging, 
  CheckCircle, 
  PaperPlaneTilt, 
  Sparkle, 
  SlidersHorizontal, 
  Check, 
  Spinner, 
  DeviceMobile, 
  ArrowRight, 
  Tag,
  Plus,
  Ticket,
  MagnifyingGlass,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

const LS_KEY = 'push_preferences_cache';
const LS_STATUS_DISMISSED_KEY = 'push_device_status_dismissed';

interface PreferencesData {
  categories: string[];
  customInterests: string[];
}

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'edit';
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const QUICK_SUGGESTIONS = [
  'iPhone', 'PS5', 'Air Fryer', 'Smart TV', 'JBL', 'Geladeira', 'Notebook', 'Kindle', 'Alexa'
];

function loadFromLocalStorage(): PreferencesData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreferencesData;
  } catch {
    return null;
  }
}

function saveToLocalStorage(prefs: PreferencesData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded ou modo privado
  }
}

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'alertas' | 'gostos'>('alertas');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [isSubscribedOnDevice, setIsSubscribedOnDevice] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [isStatusDismissed, setIsStatusDismissed] = useState<boolean>(true);
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Carrega status de dispensado do card do aparelho ──────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(LS_STATUS_DISMISSED_KEY) === 'true';
      setIsStatusDismissed(dismissed);
    }
  }, [isOpen]);

  // ── Carrega categorias dinâmicas ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories)) {
          const sorted = [...data.categories].sort((a, b) => a.localeCompare(b, 'pt-BR'));
          setAllCategories(sorted);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  // ── Verifica status do Push no dispositivo ───────────────────────────────
  const checkDevicePushStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSubscribedOnDevice(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub && sub.endpoint) {
        setSubscriptionEndpoint(sub.endpoint);
        setIsSubscribedOnDevice(true);
      } else {
        setIsSubscribedOnDevice(false);
      }
    } catch {
      setIsSubscribedOnDevice(false);
    }
  }, []);

  // ── Carrega preferências ao abrir ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    checkDevicePushStatus();

    // 1. Cache Local
    const cached = loadFromLocalStorage();
    if (cached) {
      setSelectedCategories(cached.categories ?? []);
      setCustomInterests(cached.customInterests ?? []);
    }

    // 2. Busca do servidor
    const fetchFromServer = async () => {
      try {
        let endpoint: string | null = null;
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) endpoint = sub.endpoint;
          } catch {}
        }

        let url: string | null = null;
        if (endpoint) {
          url = `/api/push/preferences?endpoint=${encodeURIComponent(endpoint)}`;
        } else if (user?.id) {
          url = `/api/push/preferences?userId=${encodeURIComponent(user.id)}`;
        }

        if (url) {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.preferences) {
              const serverPrefs: PreferencesData = {
                categories: data.preferences.categories ?? [],
                customInterests: data.preferences.customInterests ?? [],
              };
              setSelectedCategories(serverPrefs.categories);
              setCustomInterests(serverPrefs.customInterests);
              saveToLocalStorage(serverPrefs);
            }
          }
        }
      } catch (err) {
        console.warn('[Preferences] Falha ao buscar do servidor:', err);
      }
    };

    fetchFromServer();
  }, [isOpen, user?.id, checkDevicePushStatus]);

  // ── Busca produtos correspondentes aos alertas do usuário ─────────────────
  const fetchMatchingAlerts = useCallback(() => {
    if (!isOpen) return;

    setLoadingProducts(true);
    const params = new URLSearchParams();
    params.set('filter', 'alertas');

    if (customInterests.length > 0) {
      params.set('keywords', customInterests.join(','));
    }
    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    }
    if (user?.id) {
      params.set('userId', user.id);
    }
    if (subscriptionEndpoint) {
      params.set('endpoint', subscriptionEndpoint);
    }

    fetch(`/api/products?${params.toString()}&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMatchingProducts(data.slice(0, 15));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, [isOpen, customInterests, selectedCategories, user?.id, subscriptionEndpoint]);

  useEffect(() => {
    if (isOpen && activeTab === 'alertas') {
      fetchMatchingAlerts();
    }
  }, [isOpen, activeTab, fetchMatchingAlerts]);

  // ── Trava de Scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Ativar Push no Aparelho ───────────────────────────────────────────────
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleActivatePush = async () => {
    setIsSubscribing(true);
    try {
      if (!('Notification' in window)) {
        alert('Este navegador não suporta notificações.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você precisa permitir as notificações no navegador para receber os alertas.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key não configurada.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const newEndpoint = subscription.endpoint;
      setSubscriptionEndpoint(newEndpoint);
      setIsSubscribedOnDevice(true);

      const prefs: PreferencesData = {
        categories: selectedCategories,
        customInterests,
      };

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: newEndpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          preferences: prefs,
          userId: user?.id,
        }),
      });

      setTestSuccess('Notificações ativadas com sucesso neste aparelho!');
      setTimeout(() => setTestSuccess(null), 3500);
    } catch (err: any) {
      console.error('Erro ao ativar push:', err);
      alert('Erro ao ativar notificações: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSubscribing(false);
    }
  };

  // ── Testar Notificação Push no Aparelho (Some da tela e persiste) ────────
  const handleTestPush = async () => {
    if (!subscriptionEndpoint) {
      alert('Ative as notificações primeiro.');
      return;
    }

    setIsStatusDismissed(true);
    try {
      localStorage.setItem(LS_STATUS_DISMISSED_KEY, 'true');
    } catch {}

    setIsTestingPush(true);
    setTestSuccess('Disparando notificação de teste no seu celular...');

    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscriptionEndpoint }),
      });

      if (res.ok) {
        setTestSuccess('🔔 Teste enviado! Verifique as notificações do seu celular.');
      } else {
        setTestSuccess('Notificação enviada para a fila de disparo.');
      }
      setTimeout(() => setTestSuccess(null), 4000);
    } catch (err) {
      console.error('Erro ao testar push:', err);
      setTestSuccess('Teste solicitado.');
      setTimeout(() => setTestSuccess(null), 3000);
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleDismissStatusCard = () => {
    setIsStatusDismissed(true);
    try {
      localStorage.setItem(LS_STATUS_DISMISSED_KEY, 'true');
    } catch {}
  };

  // ── Salvar Preferências ───────────────────────────────────────────────────
  const savePreferences = useCallback(
    async (newCats: string[], newInterests: string[]) => {
      const prefs: PreferencesData = {
        categories: newCats,
        customInterests: newInterests,
      };

      saveToLocalStorage(prefs);
      setSaveStatus('saving');

      try {
        let endpoint = subscriptionEndpoint;
        if (!endpoint && 'serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) endpoint = sub.endpoint;
          } catch {}
        }

        const body: Record<string, unknown> = {
          preferences: prefs,
        };
        if (endpoint) body.endpoint = endpoint;
        if (user?.id) body.userId = user.id;

        const res = await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('[Preferences] Falha ao salvar no servidor:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    },
    [subscriptionEndpoint, user?.id]
  );

  const toggleCategory = (category: string) => {
    const newCats = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newCats);
    savePreferences(newCats, customInterests);
  };

  const handleAddInterestValue = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;

    if (!customInterests.includes(trimmed)) {
      const newInterests = [...customInterests, trimmed];
      setCustomInterests(newInterests);
      savePreferences(selectedCategories, newInterests);
    }
  };

  const handleAddInterest = () => {
    handleAddInterestValue(newInterest);
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    const newInterests = customInterests.filter((i) => i !== interest);
    setCustomInterests(newInterests);
    savePreferences(selectedCategories, newInterests);
  };

  // Categorias filtradas pela busca
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return allCategories;
    const q = categorySearch.toLowerCase().trim();
    return allCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [allCategories, categorySearch]);

  const totalAlertsCount = customInterests.length + selectedCategories.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 380, damping: 32 },
        }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="relative w-full max-w-lg bg-[#0d0f12] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] rounded-[2rem] flex flex-col overflow-hidden max-h-[90vh] z-10 backdrop-blur-2xl"
      >
        {/* Header Premium */}
        <div className="flex flex-col shrink-0 bg-zinc-950/80 border-b border-white/[0.08] px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                <BellRinging size={22} weight="fill" className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white leading-tight flex items-center gap-2">
                  Alertas Personalizados
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSubscribedOnDevice ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-zinc-400">
                    {isSubscribedOnDevice ? 'Notificações ativas no aparelho' : 'Notificações não configuradas'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Feedback de salvamento */}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-900/80 px-2.5 py-1 rounded-full border border-white/5">
                  <Spinner size={13} className="animate-spin text-amber-400" />
                  <span className="hidden sm:inline text-[11px]">Salvando...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Check size={13} weight="bold" />
                  <span className="hidden sm:inline text-[11px]">Salvo</span>
                </span>
              )}

              {/* Botão Fechar */}
              <button
                onClick={onClose}
                aria-label="Fechar modal"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0 active:scale-95"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Segmented Control Tabs */}
          <div className="mt-4 bg-zinc-900/80 p-1 rounded-xl border border-white/[0.06] flex items-center gap-1">
            <button
              onClick={() => setActiveTab('alertas')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${
                activeTab === 'alertas'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Sparkle size={14} weight={activeTab === 'alertas' ? 'fill' : 'regular'} className={activeTab === 'alertas' ? 'text-amber-400' : 'text-zinc-500'} />
              <span>Meus Alertas</span>
              {totalAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/25 text-amber-200 font-extrabold">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('gostos')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${
                activeTab === 'gostos'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <SlidersHorizontal size={14} weight={activeTab === 'gostos' ? 'bold' : 'regular'} className={activeTab === 'gostos' ? 'text-amber-400' : 'text-zinc-500'} />
              <span>Configurar Gostos</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto hidden-scrollbar flex-1 p-5 space-y-4">
          {/* Notificação / Toast de Sucesso */}
          <AnimatePresence>
            {testSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/50"
              >
                <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
                <span className="font-medium flex-1">{testSuccess}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 1: MEUS ALERTAS (Visual Limpo & Ofertas Diretas)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'alertas' && (
            <motion.div
              key="tab-alertas"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-4"
            >
              {/* Card de Status do Aparelho (SÓ APARECE UMA VEZ / ATÉ O USUÁRIO TESTAR OU DISPENSAR) */}
              {!isStatusDismissed && (
                <motion.div
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="relative overflow-hidden bg-gradient-to-r from-zinc-900/90 to-zinc-900/50 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <DeviceMobile size={22} weight="duotone" className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Status do Aparelho</span>
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Configuração
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {isSubscribedOnDevice
                          ? 'Seu celular está pronto. Teste para confirmar o recebimento.'
                          : 'Ative as notificações para receber alertas neste celular.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isSubscribedOnDevice ? (
                      <button
                        onClick={handleTestPush}
                        disabled={isTestingPush}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isTestingPush ? (
                          <Spinner size={14} className="animate-spin text-black" />
                        ) : (
                          <PaperPlaneTilt size={14} weight="fill" />
                        )}
                        <span>Testar Notificação</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleActivatePush}
                        disabled={isSubscribing}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSubscribing ? (
                          <Spinner size={14} className="animate-spin text-black" />
                        ) : (
                          <BellRinging size={14} weight="fill" />
                        )}
                        <span>Ativar no Celular</span>
                      </button>
                    )}

                    <button
                      onClick={handleDismissStatusCard}
                      title="Dispensar aviso"
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Resumo dos Alertas Ativos (Chips) */}
              <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Tag size={13} weight="bold" className="text-amber-400" />
                    <span>Seus Termos & Categorias Ativas</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('gostos')}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus size={12} weight="bold" />
                    <span>Gerenciar</span>
                  </button>
                </div>

                {customInterests.length === 0 && selectedCategories.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-zinc-400">
                      Você ainda não cadastrou termos específicos.
                    </p>
                    <button
                      onClick={() => setActiveTab('gostos')}
                      className="mt-2 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all"
                    >
                      + Adicionar meus primeiros gostos
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {customInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 rounded-lg font-medium"
                      >
                        <span>🏷️ {interest}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="hover:text-white transition-colors ml-0.5"
                        >
                          <X size={11} weight="bold" />
                        </button>
                      </span>
                    ))}
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 bg-zinc-800/80 border border-white/10 text-zinc-300 text-xs px-2.5 py-1 rounded-lg font-medium"
                      >
                        <span className="capitalize">📂 {cat}</span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="hover:text-white transition-colors ml-0.5"
                        >
                          <X size={11} weight="bold" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ofertas em Tempo Real dos Seus Alertas */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Sparkle size={14} weight="fill" className="text-amber-400" />
                      <span>Ofertas dos Seus Alertas</span>
                    </h3>
                    {!loadingProducts && matchingProducts.length > 0 && (
                      <span className="text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">
                        {matchingProducts.length} ativas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchMatchingAlerts}
                      title="Atualizar ofertas"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                    >
                      <ArrowsClockwise size={13} className={loadingProducts ? 'animate-spin text-amber-400' : ''} />
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('change-filter', { detail: { filter: 'alertas' } }));
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <span>Ver todas na home</span>
                      <ArrowRight size={12} weight="bold" />
                    </button>
                  </div>
                </div>

                {loadingProducts && (
                  <div className="flex flex-col gap-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-zinc-900/50 border border-white/[0.04] rounded-2xl animate-pulse" />
                    ))}
                  </div>
                )}

                {!loadingProducts && matchingProducts.length === 0 && (
                  <div className="bg-zinc-900/30 border border-white/[0.05] rounded-2xl p-6 text-center text-zinc-400">
                    <div className="w-10 h-10 rounded-full bg-white/5 mx-auto mb-2 flex items-center justify-center text-zinc-400">
                      <Sparkle size={20} />
                    </div>
                    <p className="text-xs font-medium text-zinc-300">Nenhuma oferta ativa no momento para os termos escolhidos.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Assim que uma nova oferta entrar no ar, você receberá a notificação!</p>
                  </div>
                )}

                {!loadingProducts && matchingProducts.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {matchingProducts.map((p) => {
                      const hasCoupon = p.coupons && p.coupons.length > 0;
                      const hasDiscount = p.originalPrice && p.price && p.originalPrice > p.price;
                      const discountPct = hasDiscount 
                        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            onClose();
                            router.push(`/produto/${p.shortId || p.id}`);
                          }}
                          className="group cursor-pointer bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.06] hover:border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-3.5 transition-all shadow-sm active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-13 h-13 rounded-xl bg-black/50 border border-white/5 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={p.imageUrl || '/placeholder.webp'}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.webp';
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                                {p.name}
                              </h5>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {p.category && (
                                  <span className="text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05] capitalize">
                                    {p.category}
                                  </span>
                                )}
                                {hasCoupon && (
                                  <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    🎟️ Cupom
                                  </span>
                                )}
                                {discountPct > 0 && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                                    -{discountPct}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 pl-1">
                            {hasDiscount && (
                              <span className="text-[10px] text-zinc-500 line-through">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.originalPrice)}
                              </span>
                            )}
                            <span className="text-sm font-extrabold text-white tracking-tight">
                              {p.price
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)
                                : 'Ver preço'}
                            </span>
                            <span className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-0.5 mt-1">
                              Ver <ArrowRight size={11} weight="bold" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 2: CONFIGURAR GOSTOS (Termos e Categorias)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'gostos' && (
            <motion.div
              key="tab-gostos"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="space-y-4"
            >
              {/* Informativo Visual de Notificações de Cupons */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Ticket size={18} weight="fill" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Cupons e Alertas Inteligentes
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Você receberá todos os cupons de desconto automaticamente, além de ser alertado exclusivamente quando surgirem ofertas dos seus termos e categorias escolhidos abaixo.
                  </p>
                </div>
              </div>

              {/* Termos Escolhidos (Marcas ou Produtos) */}
              <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Tag size={14} weight="bold" className="text-amber-400" />
                    <span>Produtos e Marcas de Interesse</span>
                  </h3>
                  <p className="text-zinc-500 text-[11px]">
                    Cadastre nomes de produtos ou marcas para ser avisado imediatamente.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Ex: ps5, jbl, air fryer, geladeira..."
                      className="w-full bg-zinc-950 border border-white/10 text-white pl-3.5 pr-3 py-2.5 rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInterest();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-md shadow-amber-500/20"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Sugestões Rápidas em Chips */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Sugestões Populares:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SUGGESTIONS.filter((s) => !customInterests.includes(s.toLowerCase())).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddInterestValue(sug)}
                        className="text-[11px] bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 text-zinc-300 hover:text-amber-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Plus size={10} weight="bold" className="text-amber-400" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Ativas */}
                {customInterests.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                      Alertas Cadastrados ({customInterests.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {customInterests.map((interest) => (
                        <span
                          key={interest}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-xl font-semibold shadow-sm"
                        >
                          <span>🏷️ {interest}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(interest)}
                            className="hover:text-white transition-colors"
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sugestões de Categorias */}
              <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <span>Categorias de Interesse</span>
                    {selectedCategories.length > 0 && (
                      <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                        {selectedCategories.length} selecionadas
                      </span>
                    )}
                  </h3>
                </div>

                {/* Input de filtro de categorias */}
                {allCategories.length > 6 && (
                  <div className="relative">
                    <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Buscar categoria..."
                      className="w-full bg-zinc-950 border border-white/10 text-white pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1 hidden-scrollbar">
                  {filteredCategories.length === 0 ? (
                    <p className="text-zinc-500 text-xs py-2">
                      {allCategories.length === 0 ? 'Carregando categorias...' : 'Nenhuma categoria encontrada.'}
                    </p>
                  ) : (
                    filteredCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 border-amber-500/50 text-amber-200 shadow-sm'
                              : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          {isSelected ? (
                            <Check size={12} weight="bold" className="text-amber-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          )}
                          <span className="capitalize">{cat}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
