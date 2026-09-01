'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  FloppyDisk,
  ArrowRight,
  Tag
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

const LS_KEY = 'push_preferences_cache';

interface PreferencesData {
  all?: boolean;
  couponsOnly?: boolean;
  categories: string[];
  customInterests: string[];
}

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'edit';
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

export function NotificationPreferencesModal({ isOpen, onClose, mode }: NotificationPreferencesModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'alertas' | 'gostos'>('gostos');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [receiveAll, setReceiveAll] = useState<boolean>(true);
  const [couponsOnly, setCouponsOnly] = useState<boolean>(false);
  const [newInterest, setNewInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [isSubscribedOnDevice, setIsSubscribedOnDevice] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
      setReceiveAll(cached.all ?? true);
      setCouponsOnly(cached.couponsOnly ?? false);
    }

    // 2. Busca do servidor
    setIsLoading(true);
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
                all: data.preferences.all ?? true,
                couponsOnly: data.preferences.couponsOnly ?? false,
                categories: data.preferences.categories ?? [],
                customInterests: data.preferences.customInterests ?? [],
              };
              setSelectedCategories(serverPrefs.categories);
              setCustomInterests(serverPrefs.customInterests);
              setReceiveAll(serverPrefs.all ?? true);
              setCouponsOnly(serverPrefs.couponsOnly ?? false);
              saveToLocalStorage(serverPrefs);
            }
          }
        }
      } catch (err) {
        console.warn('[Preferences] Falha ao buscar do servidor:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromServer();
  }, [isOpen, user?.id, checkDevicePushStatus]);

  // ── Busca produtos correspondentes aos alertas do usuário ─────────────────
  useEffect(() => {
    if (!isOpen || activeTab !== 'alertas') return;

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
          setMatchingProducts(data.slice(0, 10));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, [isOpen, activeTab, customInterests, selectedCategories, user?.id, subscriptionEndpoint]);

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
        all: receiveAll,
        couponsOnly,
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
      setTimeout(() => setTestSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erro ao ativar push:', err);
      alert('Erro ao ativar notificações: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSubscribing(false);
    }
  };

  // ── Testar Notificação Push no Aparelho (Envia e fecha o modal) ───────────
  const handleTestPush = async () => {
    if (!subscriptionEndpoint) {
      alert('Ative as notificações primeiro.');
      return;
    }

    setIsTestingPush(true);
    try {
      // Dispara o teste de notificação
      fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscriptionEndpoint }),
      }).catch(console.error);

      // Fecha a janela imediatamente conforme solicitado
      onClose();
    } catch (err) {
      console.error('Erro ao testar push:', err);
      onClose();
    } finally {
      setIsTestingPush(false);
    }
  };

  // ── Salvar Preferências ───────────────────────────────────────────────────
  const savePreferences = useCallback(
    async (newCats: string[], newInterests: string[], newAll: boolean, newCoupons: boolean) => {
      const prefs: PreferencesData = {
        all: newAll,
        couponsOnly: newCoupons,
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
    savePreferences(newCats, customInterests, receiveAll, couponsOnly);
  };

  const handleAddInterest = () => {
    const trimmed = newInterest.trim().toLowerCase();
    if (!trimmed) return;

    if (!customInterests.includes(trimmed)) {
      const newInterests = [...customInterests, trimmed];
      setCustomInterests(newInterests);
      savePreferences(selectedCategories, newInterests, receiveAll, couponsOnly);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    const newInterests = customInterests.filter((i) => i !== interest);
    setCustomInterests(newInterests);
    savePreferences(selectedCategories, newInterests, receiveAll, couponsOnly);
  };

  const toggleReceiveAll = () => {
    const newVal = !receiveAll;
    setReceiveAll(newVal);
    savePreferences(selectedCategories, customInterests, newVal, couponsOnly);
  };

  const toggleCouponsOnly = () => {
    const newVal = !couponsOnly;
    setCouponsOnly(newVal);
    savePreferences(selectedCategories, customInterests, receiveAll, newVal);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 24 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 350, damping: 30 },
        }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        className="relative w-full max-w-lg bg-zinc-950/95 border border-white/10 shadow-2xl shadow-black/90 rounded-[2rem] flex flex-col overflow-hidden max-h-[90vh] z-10 backdrop-blur-2xl"
      >
        {/* Header Bar */}
        <div className="flex flex-col shrink-0 bg-zinc-900/50 border-b border-white/10">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-red-500/10 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-orange-500/15 shrink-0">
                <BellRinging size={22} weight="fill" className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  Alertas Personalizados
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSubscribedOnDevice ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-zinc-400">
                    {isSubscribedOnDevice ? 'Notificações ativas neste aparelho' : 'Push inativo no aparelho'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status de salvamento */}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-zinc-400 text-xs">
                  <Spinner size={14} className="animate-spin text-amber-400" />
                  <span className="hidden sm:inline">Salvando...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-400 text-xs">
                  <FloppyDisk size={14} weight="fill" />
                  <span className="hidden sm:inline">Salvo</span>
                </span>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Fechar modal"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all shrink-0 active:scale-95"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Dual Tabs */}
          <div className="flex px-5 gap-6 border-t border-white/5 pt-2">
            <button
              onClick={() => setActiveTab('alertas')}
              className={`pb-2.5 text-xs sm:text-sm font-bold transition-all relative ${
                activeTab === 'alertas' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkle size={15} weight={activeTab === 'alertas' ? 'fill' : 'regular'} className="text-amber-400" />
                <span>Meus Alertas</span>
                {(customInterests.length > 0 || selectedCategories.length > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {customInterests.length + selectedCategories.length}
                  </span>
                )}
              </div>
              {activeTab === 'alertas' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-full"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('gostos')}
              className={`pb-2.5 text-xs sm:text-sm font-bold transition-all relative ${
                activeTab === 'gostos' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={15} weight={activeTab === 'gostos' ? 'bold' : 'regular'} className="text-orange-400" />
                <span>Configurar Gostos</span>
              </div>
              {activeTab === 'gostos' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-full"
                />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto hidden-scrollbar flex-1 p-5 space-y-4">
          {/* Mensagem de sucesso ao testar push */}
          {testSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg"
            >
              <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />
              <span>{testSuccess}</span>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 1: MEUS ALERTAS (Status & Ofertas em 1 por linha)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'alertas' && (
            <motion.div
              key="tab-alertas"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {/* Card de Status do Aparelho */}
              <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <DeviceMobile size={22} weight="duotone" className="text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Status do Aparelho</h4>
                    <p className="text-xs text-zinc-400">
                      {isSubscribedOnDevice
                        ? 'Este celular está pronto e recebendo notificações.'
                        : 'Ative as notificações para receber alertas neste celular.'}
                    </p>
                  </div>
                </div>

                {isSubscribedOnDevice ? (
                  <button
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-white/10 flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isTestingPush ? (
                      <Spinner size={14} className="animate-spin" />
                    ) : (
                      <PaperPlaneTilt size={14} weight="fill" className="text-amber-400" />
                    )}
                    <span>Testar Notificação</span>
                  </button>
                ) : (
                  <button
                    onClick={handleActivatePush}
                    disabled={isSubscribing}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isSubscribing ? (
                      <Spinner size={14} className="animate-spin" />
                    ) : (
                      <BellRinging size={15} weight="fill" />
                    )}
                    <span>Ativar neste Celular</span>
                  </button>
                )}
              </div>

              {/* Ofertas em Tempo Real dos Seus Alertas (1 por linha) */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkle size={14} weight="fill" className="text-amber-400" />
                    <span>Ofertas Atuais dos Seus Alertas</span>
                  </h3>
                  <button
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('change-filter', { detail: { filter: 'alertas' } }));
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Ver todas na home →
                  </button>
                </div>

                {loadingProducts && (
                  <div className="flex flex-col gap-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-zinc-900/60 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                )}

                {!loadingProducts && matchingProducts.length === 0 && (
                  <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 text-center text-zinc-400">
                    <p className="text-xs">Nenhuma oferta ativa no momento para os termos escolhidos.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Assim que surgir uma oferta, você receberá a notificação!</p>
                  </div>
                )}

                {!loadingProducts && matchingProducts.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {matchingProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onClose();
                          router.push(`/produto/${p.shortId || p.id}`);
                        }}
                        className="group cursor-pointer bg-zinc-900/80 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-3.5 transition-all hover:bg-zinc-850 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={p.imageUrl || '/placeholder.webp'}
                            alt={p.name}
                            className="w-14 h-14 rounded-xl object-contain bg-black/40 border border-white/5 p-1 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.webp';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-tight group-hover:text-amber-400 transition-colors">
                              {p.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {p.category && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md">
                                  <span>{p.category}</span>
                                </span>
                              )}
                              {p.coupons && p.coupons.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold">
                                  <span>🎟️ CUPOM</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-sm font-bold text-white tracking-tight">
                            {p.price
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)
                              : 'Ver oferta'}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-0.5 mt-1">
                            Ver <ArrowRight size={11} weight="bold" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 2: MEUS GOSTOS (Configuração de Termos, Toggles e Categorias)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'gostos' && (
            <motion.div
              key="tab-gostos"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {/* Toggles Rápidos */}
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-3.5 space-y-3">
                {/* Toggle: Todas as Ofertas */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Receber todas as super promoções</h4>
                    <p className="text-[11px] text-zinc-400">
                      Recomendado para não perder nenhuma oportunidade imperdível.
                    </p>
                  </div>
                  <button
                    onClick={toggleReceiveAll}
                    type="button"
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      receiveAll ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        receiveAll ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle: Apenas Cupons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Apenas cupons de desconto</h4>
                    <p className="text-[11px] text-zinc-400">
                      Notificar exclusivamente quando houver cupom disponível.
                    </p>
                  </div>
                  <button
                    onClick={toggleCouponsOnly}
                    type="button"
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      couponsOnly ? 'bg-orange-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        couponsOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Termos Escolhidos (Marcas ou Produtos) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Termos Escolhidos (Marcas ou Produtos)
                </h3>
                <p className="text-zinc-500 text-[11px] mb-2.5">
                  Digite produtos ou marcas do seu interesse (ex: "iphone", "ps5", "geladeira", "jbl") para ser alertado.
                </p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Ex: ps5, jbl, air fryer, geladeira..."
                    className="flex-1 bg-zinc-900 border border-white/10 text-white px-3.5 py-2.5 rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:bg-zinc-900 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 shrink-0"
                  >
                    Adicionar
                  </button>
                </div>

                {customInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {customInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-xl font-medium"
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
                )}
              </div>

              {/* Sugestões de Categorias */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Sugestões de Categorias
                </h3>

                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1 hidden-scrollbar">
                  {allCategories.length === 0 ? (
                    <p className="text-zinc-500 text-xs">Carregando categorias...</p>
                  ) : (
                    allCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/20 border-amber-500/50 text-amber-200 shadow-sm'
                              : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {isSelected && <Check size={12} weight="bold" className="text-amber-400" />}
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
