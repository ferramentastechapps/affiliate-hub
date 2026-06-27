'use client';

import { useState, useEffect } from 'react';
import { X, BellRinging, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'install' | 'edit';
}

export function NotificationPreferencesModal({ isOpen, onClose, mode }: NotificationPreferencesModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Bem-vindo/Opções, 2 = Processando/Final
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [receiveAll, setReceiveAll] = useState(true);
  const [couponsOnly, setCouponsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);

  // Carrega categorias dinâmicas
  useEffect(() => {
    if (!isOpen) return;
    
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          setAllCategories(data.categories);
        }
      })
      .catch(console.error);

    // Se for modo edit, carrega as preferências atuais
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
              setReceiveAll(data.preferences.all);
              setCouponsOnly(data.preferences.couponsOnly || false);
              setSelectedCategories(data.preferences.categories || []);
              setCustomInterests(data.preferences.customInterests || []);
            }
          }
        }
        setIsLoading(false);
      });
    } else {
      setStep(1);
      setReceiveAll(true);
      setCouponsOnly(false);
      setSelectedCategories([]);
      setCustomInterests([]);
    }
  }, [isOpen, mode]);

  const toggleCategory = (category: string) => {
    // Se "Todas as promoções" ou "Apenas cupons" estiver ativo, desativa-os ao clicar em categorias específicas
    if (receiveAll) {
      setReceiveAll(false);
    }
    if (couponsOnly) {
      setCouponsOnly(false);
    }
    
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleAddInterest = () => {
    const trimmed = newInterest.trim().toLowerCase();
    if (!trimmed) return;

    if (receiveAll) {
      setReceiveAll(false);
    }
    if (couponsOnly) {
      setCouponsOnly(false);
    }

    if (!customInterests.includes(trimmed)) {
      setCustomInterests(prev => [...prev, trimmed]);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    setCustomInterests(prev => prev.filter(i => i !== interest));
  };

  const handleToggleReceiveAll = () => {
    const nextVal = !receiveAll;
    setReceiveAll(nextVal);
    if (nextVal) {
      setCouponsOnly(false);
      setSelectedCategories([]);
      setCustomInterests([]);
    }
  };

  const handleToggleCouponsOnly = () => {
    const nextVal = !couponsOnly;
    setCouponsOnly(nextVal);
    if (nextVal) {
      setReceiveAll(false);
      setSelectedCategories([]);
      setCustomInterests([]);
    }
  };

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

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const preferences = {
        all: receiveAll,
        couponsOnly: couponsOnly,
        categories: (receiveAll || couponsOnly) ? [] : selectedCategories,
        customInterests: (receiveAll || couponsOnly) ? [] : customInterests
      };

      if (mode === 'edit' && subscriptionEndpoint) {
        // Apenas atualiza
        await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscriptionEndpoint, preferences })
        });
        alert('Preferências atualizadas com sucesso!');
        onClose();
        return;
      }

      // Modo Install (POST subscribe + Permissions)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você precisa permitir as notificações no navegador para continuar.');
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          preferences
        }),
      });

      if (response.ok) {
        setStep(2); // Sucesso
        setTimeout(() => {
          onClose();
          setStep(1);
        }, 2500);
      } else {
        throw new Error('Erro ao salvar subscription');
      }

    } catch (err) {
      console.error(err);
      alert('Houve um erro ao salvar suas preferências. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <BellRinging size={22} weight="fill" className="text-orange-500" />
            </div>
            <h2 className="text-white font-bold text-lg">
              {mode === 'install' ? 'Notificações' : 'Configurar Alertas'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {step === 1 && (
          <div className="p-5 flex-1 overflow-y-auto">
            {mode === 'install' && (
              <p className="text-zinc-300 mb-6 text-sm">
                Quer receber alertas de promoções na hora? Escolha o que te interessa 👇
              </p>
            )}

            {/* Toggle Geral e Apenas Cupons */}
            <div className="space-y-3 mb-6">
              <div 
                className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-center justify-between ${
                  receiveAll ? 'bg-orange-500/10 border-orange-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
                onClick={handleToggleReceiveAll}
              >
                <div>
                  <p className="text-white font-medium">🔔 Todas as promoções</p>
                  <p className="text-zinc-400 text-xs mt-1">Receba tudo e não perca nenhuma oferta</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${receiveAll ? 'bg-orange-500' : 'bg-zinc-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${receiveAll ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>

              <div 
                className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-center justify-between ${
                  couponsOnly ? 'bg-orange-500/10 border-orange-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
                onClick={handleToggleCouponsOnly}
              >
                <div>
                  <p className="text-white font-medium">🎟️ Só os cupons</p>
                  <p className="text-zinc-400 text-xs mt-1">Receba apenas cupons de desconto das lojas</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${couponsOnly ? 'bg-orange-500' : 'bg-zinc-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${couponsOnly ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </div>

            {/* Lista Dinâmica */}
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Categorias Específicas</h3>
            
            <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {allCategories.length === 0 ? (
                <p className="text-zinc-500 text-sm">Carregando categorias...</p>
              ) : (
                allCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="capitalize">{cat}</span>
                      {isSelected && <CheckCircle size={12} weight="bold" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Alertas Customizados por Palavra-Chave */}
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
              Alertas por Palavras-Chave (Livre)
            </h3>
            <p className="text-zinc-500 text-[11px] mb-3 leading-relaxed">
              Digite marcas ou produtos de seu interesse (ex: "iphone", "rtx 4060", "tenis nike") para receber alertas sempre que aparecerem.
            </p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Ex: ps5, jbl, ar condicionado..."
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

            {customInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6 max-h-32 overflow-y-auto pr-1">
                {customInterests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1.5 bg-zinc-850 border border-zinc-750 text-zinc-300 text-xs px-2.5 py-1 rounded-md"
                  >
                    <span>{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="text-zinc-500 hover:text-red-400 ml-0.5 cursor-pointer flex items-center justify-center"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isLoading || (!receiveAll && !couponsOnly && selectedCategories.length === 0 && customInterests.length === 0)}
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : mode === 'install' ? 'Ativar Notificações' : 'Salvar Preferências'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-10 flex flex-col items-center justify-center flex-1">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} weight="fill" className="text-green-500" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Tudo certo!</h3>
            <p className="text-zinc-400 text-center text-sm">
              Suas preferências foram salvas. Você será notificado sobre as melhores ofertas.
            </p>
          </div>
        )}


      </div>
    </div>
  );
}
