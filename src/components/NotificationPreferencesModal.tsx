'use client';

import { useState, useEffect } from 'react';
import { X, BellRinging, CheckCircle, ClockCounterClockwise, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'edit';
}

export function NotificationPreferencesModal({ isOpen, onClose, mode }: NotificationPreferencesModalProps) {
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);

  // Carrega categorias dinâmicas
  useEffect(() => {
    if (!isOpen) return;
    
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) setAllCategories(data.categories);
      })
      .catch(console.error);

    if (mode === 'edit') {
      setIsLoading(true);
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setSubscriptionEndpoint(subscription.endpoint);
          const res = await fetch(`/api/push/preferences?endpoint=${encodeURIComponent(subscription.endpoint)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.preferences) {
              setSelectedCategories(data.preferences.categories || []);
              setCustomInterests(data.preferences.customInterests || []);
            }
          }
        }
        setIsLoading(false);
      });
    } else {
      setSelectedCategories([]);
      setCustomInterests([]);
    }
  }, [isOpen, mode]);

  // Bloqueia o scroll da página (fundo) quando o modal está aberto
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

  const ensureSubscription = async (): Promise<string | null> => {
    if (subscriptionEndpoint) return subscriptionEndpoint;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Você precisa permitir as notificações no navegador para receber os alertas.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    setSubscriptionEndpoint(subscription.endpoint);
    
    // Create initial subscription on server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh,
          auth: subscription.toJSON().keys?.auth,
        },
        preferences: { all: false, couponsOnly: false, categories: [], customInterests: [] }
      }),
    });
    
    return subscription.endpoint;
  };

  const savePreferences = async (newCats: string[], newInterests: string[]) => {
    const endpoint = await ensureSubscription();
    if (!endpoint) return;

    await fetch('/api/push/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        endpoint, 
        preferences: { all: false, couponsOnly: false, categories: newCats, customInterests: newInterests } 
      })
    });
  };

  const toggleCategory = (category: string) => {
    const newCats = selectedCategories.includes(category) 
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCats);
    savePreferences(newCats, customInterests);
  };

  const handleAddInterest = () => {
    const trimmed = newInterest.trim().toLowerCase();
    if (!trimmed) return;

    if (!customInterests.includes(trimmed)) {
      const newInterests = [...customInterests, trimmed];
      setCustomInterests(newInterests);
      savePreferences(selectedCategories, newInterests);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    const newInterests = customInterests.filter(i => i !== interest);
    setCustomInterests(newInterests);
    savePreferences(selectedCategories, newInterests);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 animate-fade-in">
      <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden animate-slide-up relative flex flex-col max-h-[80dvh] sm:max-h-[85vh] shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col shrink-0 bg-white/5 border-b border-white/10">
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <BellRinging size={22} weight="fill" className="text-orange-500" />
              </div>
              <h2 className="text-white font-bold text-lg">
                Alertas Personalizados
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 gap-6">
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent("change-filter", { detail: { filter: 'alertas' } }));
              }}
              className="pb-3 text-sm font-semibold transition-colors relative text-zinc-500 hover:text-orange-500"
            >
              Meus alertas
            </button>
            <button
              className="pb-3 text-sm font-semibold transition-colors relative text-white"
            >
              Meus gostos
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full" />
            </button>
          </div>
        </div>

        {/* Tab: Settings */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {mode === 'install' && !subscriptionEndpoint && (
            <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 p-3 rounded-xl text-xs mb-5">
                Configure seus alertas! Ao selecionar o primeiro item, pediremos permissão para te notificar. As configurações são salvas automaticamente.
              </div>
            )}

            {/* Custom Interests */}
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
              Termos Escolhidos (Marcas ou Produtos)
            </h3>
            <p className="text-zinc-500 text-[11px] mb-3 leading-relaxed">
              Digite marcas ou produtos de seu interesse (ex: "iphone", "tenis nike") para receber alertas.
            </p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Ex: ps5, jbl, geladeira..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-xs placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
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
                className="bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              >
                Adicionar
              </button>
            </div>

            {(customInterests.length > 0 || selectedCategories.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-8 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {customInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-2.5 py-1.5 rounded-md"
                  >
                    <span className="font-medium">{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="text-orange-500/50 hover:text-orange-400 ml-0.5 cursor-pointer flex items-center justify-center"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
                
                {selectedCategories.map((cat) => (
                  <span
                    key={`top-${cat}`}
                    className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-2.5 py-1.5 rounded-md"
                  >
                    <span className="font-medium capitalize">{cat}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="text-orange-500/50 hover:text-orange-400 ml-0.5 cursor-pointer flex items-center justify-center"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Categories */}
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Sugestões de Categorias
            </h3>
            
            <div className="flex flex-wrap gap-2 pb-5">
              {allCategories.length === 0 ? (
                <p className="text-zinc-500 text-sm">Carregando categorias...</p>
              ) : (
                allCategories.filter(cat => !selectedCategories.includes(cat)).map(cat => {
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    >
                      <span className="capitalize">{cat}</span>
                    </button>
                  )
                })
              )}
            </div>
        </div>

      </div>
    </div>
  );
}
